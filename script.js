// Array of different greeting messages
const greetings = [
    "Hello World!",
    "Welcome!",
    "Greetings!",
    "Hi there!",
    "Salutations!",
    "Howdy!",
    "Hey everyone!",
    "Good day!"
];

// Get references to the elements
const greetingElement = document.getElementById('greeting');
const changeBtn = document.getElementById('changeBtn');

// Function to change the greeting message
function changeGreeting() {
    // Get a random greeting from the array
    const randomIndex = Math.floor(Math.random() * greetings.length);
    greetingElement.textContent = greetings[randomIndex];
    
    // Add animation effect
    greetingElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        greetingElement.style.transform = 'scale(1)';
    }, 200);
}

// Add event listener to the button
changeBtn.addEventListener('click', changeGreeting);

// Add a welcome message when the page loads
window.addEventListener('load', () => {
    greetingElement.style.opacity = '0';
    setTimeout(() => {
        greetingElement.style.transition = 'opacity 1s ease-in-out';
        greetingElement.style.opacity = '1';
    }, 100);
});