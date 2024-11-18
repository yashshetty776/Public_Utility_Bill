const express = require('express');
const Queue = require('./queue');
const PriorityQueue = require('./priorityQueue');
const Stack = require('./stack');

const app = express();
const PORT = 3000;

// Data Structures
const normalQueue = new Queue();
const priorityQueue = new PriorityQueue();
const transactionHistory = {};

// Priority Map
const PRIORITY_MAP = {
    'overdue': 1,
    'disconnection': 1,
    'reconnection': 2,
    'normal': 3
};

// Middleware to parse URL encoded data (form data)
app.use(express.urlencoded({ extended: true }));

// API Endpoints

// 1. Add a payment request (Normal or Priority)
app.get('/api/add-payment', (req, res) => {
    const { userId, billType, amount, requestType } = req.query;
    
    if (!userId || !billType || !amount || !requestType) {
        return res.status(400).send("Missing required parameters!");
    }

    const priority = PRIORITY_MAP[requestType] || PRIORITY_MAP['normal'];

    const request = { userId, billType, amount: Number(amount) };

    if (priority < 3) {
        priorityQueue.enqueue(request, priority);
        res.send(`Urgent request added for ${userId}: ${billType} bill of $${amount}`);
    } else {
        normalQueue.enqueue(request);
        res.send(`Normal request added for ${userId}: ${billType} bill of $${amount}`);
    }
});

// 2. Process the next payment request
app.get('/api/process', (req, res) => {
    if (!priorityQueue.isEmpty()) {
        const request = priorityQueue.dequeue().element;
        recordTransaction(request.userId, request.billType, request.amount);
        res.send(`Processed urgent payment for ${request.userId}: ${request.billType} bill of $${request.amount}`);
    } else if (!normalQueue.isEmpty()) {
        const request = normalQueue.dequeue();
        recordTransaction(request.userId, request.billType, request.amount);
        res.send(`Processed normal payment for ${request.userId}: ${request.billType} bill of $${request.amount}`);
    } else {
        res.send("No payment requests to process.");
    }
});

// 3. View user's transaction history
app.get('/api/history', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).send("Please provide a userId.");
    }

    const history = transactionHistory[userId] || [];
    res.json({ userId, history });
});

// 4. Undo the last payment for a user
app.get('/api/undo', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).send("Please provide a userId.");
    }

    if (transactionHistory[userId] && transactionHistory[userId].length > 0) {
        const lastTransaction = transactionHistory[userId].pop();
        res.json({ message: "Last payment undone.", lastTransaction });
    } else {
        res.send("No transactions to undo.");
    }
});

// Helper function to record transactions
function recordTransaction(userId, billType, amount) {
    if (!transactionHistory[userId]) {
        transactionHistory[userId] = new Stack();
    }
    transactionHistory[userId].push({ billType, amount });
}

// Welcome Page
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to the Public Utility Bill Payment System!</h1>
        <form action="/api/add-payment" method="get">
            <label>User ID: </label>
            <input type="text" name="userId" required><br>
            <label>Bill Type: </label>
            <input type="text" name="billType" required><br>
            <label>Amount: </label>
            <input type="number" name="amount" required><br>
            <label>Request Type: </label>
            <input type="text" name="requestType" required><br>
            <input type="submit" value="Submit Payment Request">
        </form>
        <br>
        <p>Use the form to submit a payment request.</p>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:$3000`);
});
