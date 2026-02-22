# Internal Wallet Service

This is an Internal Wallet Service that tracks user balances of virtual credits (like "Gold Coins" or "Diamonds") inside an application. 

It is designed to be **highly secure and robust**, making sure that NO money is ever lost or duplicated, even if thousands of users try to spend money at the exact same millisecond.

## 🧠 How it Works (The Smart Parts)

1. **The Ledger (No Deleting!)** 
   Instead of just updating a "balance" number and hoping for the best, every single transaction is recorded as two entries in a ledger (One `DEBIT` and one `CREDIT`). This double-entry accounting means we have a complete, mathematically provable history of every cent that moves.
2. **Pessimistic Locking (No Double-Spending!)** 
   If Alice tries to buy two things at the *exact same time* with her last 10 coins, the database "locks" her account during the first transaction. The second transaction has to wait in line. Once the first finishes, her balance is 0, and the second transaction safely fails.
3. **Idempotency (No Accidental Double-Charges!)** 
   If a user clicks the "Buy" button twice because their internet is slow, the server remembers the unique `Idempotency-Key` attached to that button click. It will only charge them once, and just return a cached "Success" message the second time.

## 🚀 How to Run It

You can run everything, including the database and API server, via Docker Compose.

1. **Spin up the Database and Application:**
   ```bash
   docker compose up --build -d
   ```
   *(This starts the PostgreSQL database and the API server in the background. The database runs on port 5433, and the API runs on port 3000. It also automatically applies database table creations inside `/src/db/migrations`)*

2. **Run the Seed Script:**
   To populate the database with initial users ("Alice" and "Bob") and a system Treasury, run the seed script against the running container:
   ```bash
   docker compose exec api npm run seed
   ```

*(Alternatively, to run natively: Start only the db with `docker compose up -d db`, install dependencies with `npm install`, then run `npm run migrate`, `npm run seed`, and start the app with `npm run dev`.)*

## 🛠️ Choice of Technology

*   **Node.js / Express**: Perfect for an I/O bound application. JavaScript's asynchronous event loop manages the overhead of high-concurrency requests well.
*   **TypeScript**: Ensures type safety across models and API requests, preventing unexpected runtime errors, specifically with data transformations like numeric balances.
*   **PostgreSQL**: Chosen for its robust ACID compliance guarantees and mature locking mechanisms, making it the premier choice for financial/ledger datasets.
*   **pg (node-postgres)**: A lightweight, non-blocking PostgreSQL client for Node.js, providing the necessary hooks to safely perform multi-query database transactions and row-level locks without heavy ORM bloat.
*   **Docker / Docker Compose**: Provides deterministic environments that ensure the database, migrations, and server operate identically everywhere, maximizing developer portability.

## 🌍 Deployment (Render)

This application is ready to be deployed to a public cloud provider like [Render](https://render.com) using Infrastructure as Code (the included `render.yaml` file).

1. Push this repository to your GitHub account.
2. Log in to Render and click **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml` and provision:
   * A free **PostgreSQL Database** (`wallet-db`).
   * A free **Node.js Web Service** (`wallet-api`), automatically securely injecting the `DATABASE_URL`.
5. Once your services are live, Render will provide a public URL (e.g., `https://wallet-api-xyz.onrender.com`).

**Note on Production Setup:** 
Once deployed, open the "Shell" tab for your Web Service in the Render Dashboard and manually run the setup scripts to initialize the production database:
```bash
npm run migrate
npm run seed
```

## 🔐 Strategy for Handling Concurrency

The core strategy for handling concurrent requests (e.g., a user rapidly clicking "Buy") leans heavily on standard transactional constraints and row-level locking provided by PostgreSQL:

1.  **Isolation via Transactions:** All updates are run inside `BEGIN ... COMMIT` PostgreSQL transaction blocks. If any part of the ledger fails (e.g., negative balance check fails after debit), the entire operation rolls back—meaning zero chance of money vanishing into thin air.
2.  **Pessimistic Locking (`FOR UPDATE`):** When verifying user balances, the wallet account row is locked using `SELECT * FROM wallet_accounts WHERE id = $1 FOR UPDATE`. If 5 conflicting spend requests hit the database simultaneously, PostgreSQL queues them up sequentially rather than processing them at identical snapshots in time. This guarantees that double-spending is physically impossible at the row level.
3.  **Idempotency Keys:** Every request must provide a unique `Idempotency-Key` (in HTTP headers). A middleware intercepts incoming requests and caches them. If the server sees the same key twice sequentially (due to network retries), it securely returns the cached successful response instead of repeating the underlying transaction lock logic.

## 🔌 API Endpoints

Once the server is running on `http://localhost:3000`, you can interact with the app.

### 1. Check a User's Balance
Fetches the current balances for all assets a user holds.
* **Method:** `GET`
* **URL:** `/api/wallet/balance/:userId`
* *(Example Alice ID: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)*

### 2. Make a Transaction
Moves money between the user and the system. You must specify the `type` of transaction.
* **Method:** `POST`
* **URL:** `/api/wallet/transact`
* **Required Header:** `Idempotency-Key: <unique-string-for-this-request>`
* **Body:**
  ```json
  {
    "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "amount": 50,
    "assetSlug": "gold_coins",
    "type": "TOPUP"
  }
  ```

**Transaction Types Supported:**
* `"TOPUP"`: **Debit** System Treasury ➡ **Credit** User *(User bought coins with real money)*
* `"SPEND"`: **Debit** User ➡ **Credit** System Treasury *(User bought an item in the app)*
* `"BONUS"`: **Debit** System Treasury ➡ **Credit** User *(System gave the user a reward)*
