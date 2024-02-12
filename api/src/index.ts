import "dotenv/config";
import express from "express";
import cors from "cors";
import { PORT } from "./config";
import wrapSol from "./endpoints/wrapSol";
import swap from "./endpoints/swap";
import price from "./endpoints/price";
import approveSwap from "./endpoints/approveSwap";

const app = express();

const port = PORT || 3000;

app.use(express.json());

app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.post("/wrapSol", wrapSol);

app.post("/approveSwap", approveSwap);

app.post("/swap", swap);

app.get("/price", price);

app.listen(port, () => {
  console.log("Server Started");
});
