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

You need Docker and Node.js installed.

1. **Start the Database:**
   ```bash
   docker compose up -d
   ```
   *(This starts a PostgreSQL database in the background on port 5433).*

2. **Create the Tables (Migrations):**
   ```bash
   npm run migrate
   ```

3. **Insert Fake Data (Seeds):**
   ```bash
   npm run seed
   ```
   *(This gives us a system "Treasury" account, and creates "Alice" and "Bob" with some initial Gold Coins).*

4. **Start the API Server:**
   ```bash
   npm run dev
   ```

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