# /helper.py

import os
import shutil

def load_text_from_file(filepath):
    """
    Load text from a file, exiting on failure.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: The file '{filepath}' was not found.")
        exit(1)
    except Exception as e:
        print(f"An error occurred while reading '{filepath}': {e}")
        exit(1)

def save_text_to_file(filepath, content):
    """
    Write text to a file, exiting on failure.
    """
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f"An error occurred while writing to '{filepath}': {e}")
        exit(1)
