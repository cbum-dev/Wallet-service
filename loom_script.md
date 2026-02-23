# Loom Video Script: Internal Wallet Service

**Target Length:** ~3-5 minutes
**Goal:** Explain the core architecture, the technology choices, and how the wallet service handles high concurrency securely.

---

### 1. Introduction & Overview (0:00 - 0:30)

*(Screen: Show the `README.md` or a quick diagram of the system)*

**Speaker:** 
"Hi everyone, my name is Abhishek, and I'd like to walk you through the Internal Wallet Service I built for this assignment. 

The goal of this service is to track user balances of virtual credits in a highly secure and robust way. I chose to build this using **Node.js, TypeScript, and Express**, paired with a **PostgreSQL** database. 

I picked Node because its event-loop architecture handles high-concurrency I/O bound requests exceptionally well, and I paired it with PostgreSQL because when you're dealing with financial logic and ledgers, you absolutely need strict ACID compliance and robust locking mechanisms."

---

### 2. The Ledger Architecture (0:30 - 1:15)

*(Screen: Open the `/src/db/migrations/001_init.sql` file or explain the schema)*

**Speaker:**
"Instead of just updating a single 'balance' column—which can lead to a lot of audit and race condition issues—I implemented a **Double-Entry Ledger Architecture**. 

Every transaction is recorded as two distinct entries: a `DEBIT` from one account and a `CREDIT` to another. For example, if a user spends coins, we debit their wallet and credit a central System Treasury account. 

By calculating the total sum of these ledger entries, we dynamically determine the user's balance. This means no money is ever destroyed or created out of thin air, giving us a mathematically provable, immutable history of every transaction."

---

### 3. Handling Concurrency: Transactions & Row-Level Locking (1:15 - 2:30)

*(Screen: Open `/src/controllers/wallet.controller.ts` (or wherever the `transact` logic is) and highlight the `BEGIN`, `COMMIT`, and `FOR UPDATE` lines)*

**Speaker:**
"The most critical part of this assignment was ensuring that the wallet can handle severe concurrency without double-spending. 

I solved this using raw PostgreSQL transactions and **Pessimistic Row-Level Locking**. 

Whenever a user requests a transaction, we open a `BEGIN` database transaction. First, we lock the user's account row using `SELECT ... FOR UPDATE`. This is crucial. If Alice tries to spend 10 gold coins from 50 different devices at the exact same millisecond, PostgreSQL will force those queries to queue up and process sequentially. 

The first query grabs the lock, calculates the balance, inserts the ledger rows, and then commits. By the time the second query in the queue gets the lock, the balance has been accurately updated, and if she's out of funds, the transaction safely throws an 'Insufficient Funds' error and rolls back. This makes race conditions physically impossible."

---

### 4. Idempotency (2:30 - 3:30)

*(Screen: Open `/src/middlewares/idempotency.middleware.ts`)*

**Speaker:**
"I also implemented an Idempotency Middleware. 

On the client side, networks can be flaky. A user might click the 'Buy' button, the request goes through, but their internet drops before they see the success message. They click 'Buy' again. 

To prevent them from being charged twice for the same logical action, every request requires an `Idempotency-Key` header. My middleware intercepts incoming requests and caches the response. If it sees the same key again, it bypasses the transaction logic entirely and just returns the exact same successful JSON response it sent the first time."

---

### 5. Deployment & Containerization (3:30 - 4:00)

*(Screen: Show the `docker-compose.yml` and `render.yaml` files)*

**Speaker:**
"To make this easy to run and test, I fully containerized the application. Reviewers can spin up the entire stack—database, application, and run the seed scripts—using a simple `docker compose up --build`. 

I also prepared it for cloud deployment by adding an Infrastructure-as-Code `render.yaml` file, which allows this to be instantly deployed as a fully managed PostgreSQL database and Node.js Web Service on platforms like Render.

That’s a high-level overview of the wallet service. Thanks for watching!"
