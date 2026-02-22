import express from "express";
import walletRoutes from "./routes/wallet.routes.ts";

const app = express();
app.use(express.json());

app.use("/api/wallet", walletRoutes);

app.get("/", (req, res) => {
  res.send("Wallet Service API IS UP!");
});

export default app;
