import { Request, Response } from "express";
import { checkForPreRequisites } from "./swap";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token-v3";
import { KEYS_FOLDER, getKeyPair } from "../utils/file";
import { PRICE_PER_TOKEN_B, SOLANA_CONNECTION } from "../constants";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import path from "path";
import fs from "fs-extra";

export default async function approveSwap(req: Request, res: Response) {
  try {
    const privateKey: number[] = [
      58, 130, 35, 213, 22, 225, 16, 255, 248, 50, 4, 99, 193, 89, 219, 39, 208,
      208, 229, 72, 118, 212, 243, 242, 117, 95, 92, 8, 143, 224, 135, 234, 30, 135,
      116, 227, 31, 189, 124, 88, 169, 110, 62, 87, 134, 150, 98, 102, 79, 231, 179,
      195, 185, 226, 180, 137, 183, 202, 11, 115, 253, 0, 180, 188
    ];

    const privateKeyHex: string = Buffer.from(privateKey).toString('hex');


    const keypair = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKeyHex, 'hex')));
    const { publicKey } = req.body;

    const { wlstMintAccount } = await checkForPreRequisites(keypair.publicKey.toString());

    console.log("Before Create");

    const userWlstTokenAccount = await getOrCreateAssociatedTokenAccount(
      SOLANA_CONNECTION,
      (await getKeyPair("whitelistCreator", "persons"))!,
      wlstMintAccount.publicKey,
      new PublicKey(keypair.publicKey.toString())
    );

    console.log(userWlstTokenAccount);

    console.log("Approved Before");

    const tempAuthTokenAccount = new Keypair();

    const mintPubKey = await fs.readJSON(
      path.resolve(KEYS_FOLDER, "mints", "wsol", "publicKey.json")
    );

    if (!mintPubKey) {
      throw new Error("mintPubKey not found");
    }

    res.json({
      success: false,
      data: {
        price_per: PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL,
        tempAuthTokenAccount: tempAuthTokenAccount,
      },
    });
  } catch (error) {
    console.log("An Error Occurred: ", error);

    res.json({
      success: false,
      data: null,
      error,
    });
  }
}
