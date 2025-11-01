from flask import Flask, render_template

def create_app():
    """Application factory function"""
    app = Flask(__name__, 
                template_folder='.',
                static_folder='static')
    
    @app.route("/")
    def index():
        return render_template('index.html')
    
    return app

if __name__ == "__main__":
    app = create_app()
    print("📊 Machine Learning & XAI Platform running at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
