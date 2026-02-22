# Codebase Explained

Here is a simple, easy-to-understand breakdown of what every major file in this project actually does.

---

### 📁 Root Folder Files
These are the files that configure the environment and run the big pieces of the project.

* **`docker-compose.yml`**: The recipe that tells Docker how to instantly build and run our PostgreSQL database in the background.
* **`.env`**: Our super-secret sticky note containing the database username, password, and port.
* **`package.json`**: The list of all the third-party tools (libraries) we are using (like Express and pg) and our custom shortcut scripts (like `npm run dev` and `npm run seed`).

---

### 📁 `src/` (The Application Code)
This folder holds all the actual TypeScript code that makes the API work.

* **`server.ts`**: The engine starter. It takes the built application and actually starts listening for web traffic on port 3000.
* **`app.ts`**: The application builder. It sets up the Express server, teaches it how to read JSON, and attaches all our specific `/api` routes.

#### 🔧 Core Database & Config
* **`config/db.ts`**: The bridge. This file reads our `.env` sticky note and establishes the actual connection pool so our code can talk to the PostgreSQL database.
* **`db/migrations/001_init.sql`**: The architect blueprint. This SQL file creates the empty tables in the database (`users`, `assets`, `accounts`, `ledger_entries`, `idempotency_keys`).
* **`db/seeds/seed.sql`**: The dummy data generator. This fills our empty tables with Alice, Bob, the System Treasury, and some initial Gold Coins so we have something to test with.
* **`scripts/migrate.ts` & `scripts/seed.ts`**: The helper robots. These scripts actually run the `.sql` files against the database when you type the `npm run migrate` or `npm run seed` commands.

#### 🧠 Architecture (Routes ➡ Controllers ➡ Services)
Our app uses a classic 3-layer design to keep things organized:

1. **`routes/wallet.routes.ts`** (The Map): 
   * This file just maps URLs to code. It says: *"If someone goes to `POST /api/wallet/transact`, send them to the Wallet Controller."*
2. **`controllers/wallet.controller.ts`** (The Traffic Cop): 
   * This looks at the incoming web request, checks that none of the pieces are missing (like making sure they provided an `amount` and a `userId`), figures out who is sending and who is receiving the money, and then passes those details to the Service.
3. **`services/wallet.service.ts`** (The Brain / The "Hard Part"): 
   * This is where the magic happens. It connects to the database, locks the user's account row, checks if they have enough balance, subtracts the money, adds it to the destination, and writes the two ledger entries. If anything goes wrong, it stops everything.

#### 🛡️ Utilities & Security
* **`middlewares/idempotency.middleware.ts`** (The Bouncer): 
   * This sits in front of the controller. It looks at the `Idempotency-Key` header on every request. If it sees a key it has seen before, it intercepts the request and says *"Nice try, we already processed this. Here is the same answer we gave you last time."* - completely preventing accidental double-charges.
* **`utils/transaction.ts`** (The Safety Net): 
   * A helper function that wraps all our database queries in a `BEGIN` and `COMMIT` block. This guarantees that an operation is "All or Nothing". If the server crashes halfway through a transfer, this ensures the database rolls everything back to how it was.
