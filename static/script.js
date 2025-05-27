document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Updated appendMessage function for the new HTML structure and basic markdown
    function appendMessage(sender, message) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');

        const messageIcon = document.createElement('div');
        messageIcon.classList.add('message-icon');

        const messageContent = document.createElement('div');
        messageContent.classList.add('message');

        // Basic markdown for bold, italic, and new lines
        // For more robust markdown (like code blocks), you'd need a dedicated library (e.g., marked.js)
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold **text**
                                     .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic *text*
        formattedMessage = formattedMessage.replace(/\n/g, '<br>'); // Convert newlines to HTML line breaks


        messageContent.innerHTML = formattedMessage; // Use innerHTML to render formatted text


        if (sender === 'user') {
            messageWrapper.classList.add('user-wrapper');
            messageIcon.classList.add('user-icon');
            messageIcon.textContent = 'You'; // User icon/initial
            // For user messages, content comes first, then icon for right-aligned flow
            messageWrapper.appendChild(messageContent);
            messageWrapper.appendChild(messageIcon);
        } else { // bot
            messageWrapper.classList.add('bot-wrapper');
            messageIcon.classList.add('bot-icon');
            messageIcon.textContent = 'AI'; // Bot icon/initial
            // For bot messages, icon comes first, then content
            messageWrapper.appendChild(messageIcon);
            messageWrapper.appendChild(messageContent);
        }

        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    // Your existing showTypingIndicator function (modified slightly to match new class)
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator'; // Keep the ID for easy removal
        typingDiv.classList.add('loading-indicator'); // Using the class from new CSS
        typingDiv.textContent = 'Assistant is typing...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Your existing removeTypingIndicator function
    function removeTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        appendMessage('user', message); // Display user's message immediately
        userInput.value = ''; // Clear input field
        showTypingIndicator(); // Show typing indicator

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });

            const data = await response.json();
            removeTypingIndicator(); // Remove typing indicator after response

            if (data.response) {
                appendMessage('bot', data.response);
            } else if (data.error) {
                appendMessage('bot', `Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            removeTypingIndicator(); // Remove typing indicator on error
            appendMessage('bot', 'Sorry, I am having trouble connecting right now. Please try again later.');
        } finally {
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom in case of error or before next message
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});
