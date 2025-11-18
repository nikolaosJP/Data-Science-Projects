# Resume Tailor

Resume Tailor is a Python tool that uses LLMs (currently only compatible with Google's Gemini API) to automatically tailor a LaTeX-based resume to a specific job description for free. It helps you customize your resume for different job applications quickly and efficiently.

## Installation

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/nikolaosJP/resume-tailor.git
   cd resume-tailor
   ```

2. **Set up virtual environment**:
   ```bash
   python -m venv r_tailor
   source r_tailor/bin/activate 
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configuration**:
   - Get a [Google Gemini API key](https://ai.google.dev/).
   - Set the API key as an environment variable:
     ```bash
     # Temporary session (current terminal only)
     export GEMINI_API_KEY="your_api_key_here"
     
     # Permanent setup (add to shell config)
     echo 'export GEMINI_API_KEY="your_api_key_here"' >> ~/.bashrc
     source ~/.bashrc
     ```

5. **File Preparation**:
   - Insert your resume content to: `resume/maincontent.tex`
   - Add target job description: `job_description.txt`
   - [Optional] Customize LLM instructions: `instructions.txt`

---

## Usage

After completing installation steps, run:
```bash
python main.py
```

---

## Outputs

Generated files in the `/output` directory:
- `tailored_resume.tex`: Tailored LaTeX resume
- `tailored_resume.pdf`: Compiled PDF (requires LaTeX installation)
- `analysis.md`: Detailed summary of changes made

---

## Notes
- **LaTeX Requirement**: Install a LaTeX distribution (e.g., TeX Live) if you need PDF generation.
- **Security**: Never commit your `.env` file or API key to version control.

