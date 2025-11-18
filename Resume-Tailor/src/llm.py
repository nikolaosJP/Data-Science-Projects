# llm.py

import google.generativeai as genai

def tailor_resume(resume_content, job_description, instructions, google_api_key="", model_name="gemini-exp-1206"):
    """
    Configures the API key, queries the model, and returns analysis + LaTeX body.
    Expects the response to include markers '===ANALYSIS===' and '===LATEX==='.
    Currently only works with Gemini models (with gemini-exp-1206 having the best performance as of 2025/01/25).
    """

    # Configure the Generative AI API
    genai.configure(api_key=google_api_key)
    model = genai.GenerativeModel(model_name)
    # Insert placeholders into the instructions
    prompt = instructions.replace("<insert_job_description_here>", job_description)
    prompt = prompt.replace("<insert_resume_in_latex_here>", resume_content)
    try:
        response = model.generate_content(prompt)
        full_text = response.text
        print(full_text)
        if "===ANALYSIS===" not in full_text or "===LATEX===" not in full_text:
            print("Error: Response missing required markers (===ANALYSIS=== and ===LATEX===).")
            exit(1)

        # Split out the analysis
        before_latex = full_text.split("===LATEX===")[0]
        analysis = before_latex.split("===ANALYSIS===")[1].strip()

        # Then the LaTeX portion
        after_analysis = full_text.split("===LATEX===")[1]
        latex_content = after_analysis.strip()

        # If the LLM uses code fences, remove them
        if "```latex" in latex_content:
            latex_part = latex_content.split("```latex", 1)[-1]
            if "```" in latex_part:
                latex_part = latex_part.split("```", 1)[0]
            latex_content = latex_part.strip()

        return analysis, latex_content

    except Exception as e:
        print(f"An error occurred during LLM content generation: {e}")
        exit(1)
