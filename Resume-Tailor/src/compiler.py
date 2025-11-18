# /compiler.py

import os
import subprocess
import shutil

def copy_latex_template_files(destination_dir, template_files):
    """
    Copies LaTeX resume files (e.g., main.tex, friggeri-cv.cls) to the build dir.
    """
    for filename in template_files:
        if not os.path.exists(filename):
            print(f"Error: Required LaTeX template file '{filename}' not found.")
            exit(1)
        try:
            shutil.copy(filename, destination_dir)
        except Exception as e:
            print(f"Error copying '{filename}' to '{destination_dir}': {e}")
            exit(1)

def compile_latex(build_dir, main_tex="main.tex"):
    """
    Runs xelatex on `main.tex` in the specified build_dir.
    Returns True if successful (even with warnings), False otherwise.
    The final PDF ends up as `main.pdf` in build_dir, which we can then rename or move to the parent directory.
    """
    original_dir = os.getcwd()
    try:
        os.chdir(build_dir)

        result = subprocess.run(
            ["xelatex", "-synctex=0", "-interaction=nonstopmode", main_tex],
            capture_output=True,
            text=True
        )

        # Switch back to original working directory
        os.chdir(original_dir)

        if result.returncode != 0:
            print("\n⚠️  Compilation failed. Here's a snippet of stderr:")
            print(result.stderr[:500])  # partial logs
            with open(os.path.join(build_dir, "compilation.log"), "w") as f:
                f.write(result.stdout)
                f.write("\n--- STDERR ---\n")
                f.write(result.stderr)
            return False
        return True

    except Exception as e:
        os.chdir(original_dir)
        print(f"Critical error during LaTeX compilation: {e}")
        return False

