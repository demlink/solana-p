import { Request, Response } from "express";
import { PRICE_PER_TOKEN_B } from "../constants";

export default async function price(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      price: PRICE_PER_TOKEN_B,
    },
  });
}
