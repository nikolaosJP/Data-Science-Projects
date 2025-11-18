# main.py

import os
import time
import shutil
import argparse

# Import local libraries from src/
from src.helper import load_text_from_file, save_text_to_file
from src.compiler import copy_latex_template_files, compile_latex
from src.llm import tailor_resume

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# Paths to your LaTeX sources in the 'resume/' subdirectory
RESUME_FILE = "resume/maincontent.tex"       # Original resume content
JOB_DESCRIPTION_FILE = "job_description.txt"
INSTRUCTIONS_FILE = "instructions.txt"

OUTPUT_DIR = "output"                           # Final outputs here
BUILD_DIR = os.path.join(OUTPUT_DIR, "build")   # Temp build directory

# Template files to copy into BUILD_DIR for compilation
LATEX_TEMPLATE_FILES = [
    "resume/main.tex",
    "resume/friggeri-cv.cls"
]

ANALYSIS_FILENAME = "analysis.md"
TAILORED_LATEX_FILENAME = "tailored_resume.tex"
FINAL_PDF_FILENAME = "tailored_resume.pdf"

def parse_args():
    parser = argparse.ArgumentParser(description="Tailor resume with Gemini LLM.")
    parser.add_argument("--model", type=str, default="gemini-exp-1206", help="Gemini model name (e.g. gemini-2.0-flash-exp, gemini-2.0-pro-exp-02-05, gemini-2.0-flash-thinking-exp-01-21).")
    parser.add_argument("--output_pdf", type=str, default="True", help="Compile the PDF (True or False).")
    return parser.parse_args()


def main():
    args = parse_args()
    gemini_model = args.model
    output_pdf = (args.output_pdf.lower() == "true")  # Convert "True"/"False" to bool

    print(f"Selected model: {gemini_model}")
    print(f"Output PDF: {output_pdf}")

    # Create output directories if needed
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(BUILD_DIR, exist_ok=True)

    start_time = time.time()

    # 1) Load local data
    print("Loading local files...")
    resume_text = load_text_from_file(RESUME_FILE)
    job_description = load_text_from_file(JOB_DESCRIPTION_FILE)
    instructions = load_text_from_file(INSTRUCTIONS_FILE)

    # 2) Tailor the resume using the AI LLM
    print("Tailoring the resume...")
    analysis, tailored_latex = tailor_resume(
        resume_text,
        job_description,
        instructions,
        google_api_key=GOOGLE_API_KEY,
        model_name=gemini_model
    )

    # 3) Save analysis & tailored LaTeX in OUTPUT_DIR
    analysis_filepath = os.path.join(OUTPUT_DIR, ANALYSIS_FILENAME)
    save_text_to_file(analysis_filepath, analysis)

    tailored_tex_filepath = os.path.join(OUTPUT_DIR, TAILORED_LATEX_FILENAME)
    save_text_to_file(tailored_tex_filepath, tailored_latex)

    # 4) If user wants a PDF, compile in BUILD_DIR
    if output_pdf:
        print("\nCompiling LaTeX in build directory...")
        copy_latex_template_files(BUILD_DIR, LATEX_TEMPLATE_FILES)
        shutil.copy(tailored_tex_filepath, os.path.join(BUILD_DIR, TAILORED_LATEX_FILENAME))

        success = compile_latex(BUILD_DIR, main_tex="main.tex")
        if not success:
            print("Compilation did not succeed. Check compilation.log in build directory.")
            exit(1)

        # If compilation succeeded, we expect 'main.pdf' in BUILD_DIR
        build_pdf = os.path.join(BUILD_DIR, "main.pdf")
        final_pdf = os.path.join(OUTPUT_DIR, FINAL_PDF_FILENAME)

        if os.path.exists(build_pdf):
            shutil.move(build_pdf, final_pdf)
            print(f"PDF created successfully at: {final_pdf}")
        else:
            print("No PDF generated in build directory, though compilation returned success. Investigate logs.")
    else:
        print("Skipping PDF compilation (output_pdf=False).")

    end_time = time.time()
    print(f"\n=== Done ===")
    print(f"Analysis saved to: {analysis_filepath}")
    print(f"Tailored LaTeX saved to: {tailored_tex_filepath}")
    print(f"Total time taken: {end_time - start_time:.2f} seconds")


if __name__ == "__main__":
    main()
