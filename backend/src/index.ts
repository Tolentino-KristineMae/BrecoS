import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import { ensureSchema } from "./db";
import transactionsRouter from "./routes/transactions";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", transactionsRouter);

app.get("/", (req, res) => {
  res.json({ message: "GCash Monitoring API is running." });
});

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database schema", error);
    process.exit(1);
  });
