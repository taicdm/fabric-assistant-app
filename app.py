import os
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import time # For polling

# Load environment variables
load_dotenv()

app = Flask(__name__)
# IMPORTANT: For production, use a strong, randomly generated secret key
app.secret_key = os.urandom(24) # Used for Flask sessions
CORS(app) # Enable CORS if your frontend and backend are on different domains (e.g., local dev)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
ASSISTANT_ID = os.getenv("ASSISTANT_ID")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Retrieve or create a thread
    thread_id = session.get("thread_id")
    if not thread_id:
        thread = client.beta.threads.create()
        thread_id = thread.id
        session["thread_id"] = thread_id # Store thread ID in session

    try:
        # Add user message to the thread
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=user_message,
        )

        # Run the Assistant
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=ASSISTANT_ID,
            temperature=0.3, # Set the temperature here (0.2-0.5 recommended for your assistant)
        )

        # Poll for run completion
        while run.status == "queued" or run.status == "in_progress":
            time.sleep(1) # Wait for 1 second
            run = client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )

        if run.status == "completed":
            messages = client.beta.threads.messages.list(
                thread_id=thread_id,
                order="desc", # Get latest messages first
                limit=1 # Only need the latest assistant response
            )
            assistant_response = ""
            for msg in messages.data:
                if msg.role == "assistant":
                    for content_block in msg.content:
                        if content_block.type == "text":
                            assistant_response = content_block.text.value
                            break
                    if assistant_response: # Stop after finding the first assistant text response
                        break
            
            return jsonify({"response": assistant_response})
        else:
            return jsonify({"error": f"Run failed with status: {run.status}"}), 500

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000) # Run on port 5000 for local development