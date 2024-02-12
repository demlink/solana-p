import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  // Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { Request, Response } from "express";
import {
  SOLANA_CONNECTION,
  SYSTEM_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../constants";
import { checkKeysDir } from "../utils/file";

export default async function wrapSol(req: Request, res: Response) {
  try {
    const { publicKey } = req.body;

    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys directory is missing. Please use yarn storeaddress to store"
      );
    }

    if (!publicKey) {
      throw new Error(
        "User publicKey does not exist. Please try using yarn storeaddress to generate"
      );
    }

    const balance = await SOLANA_CONNECTION.getBalance(
      new PublicKey(publicKey)
    );

    if (balance === 0) {
      throw new Error(
        "User's balance is 0 SOL. Please use yarn fundaddress to get funded"
      );
    }

    const [associatedNativeSolTokenAddress] =
      await PublicKey.findProgramAddress(
        [
          new PublicKey(publicKey).toBuffer(),
          TOKEN_PROGRAM_ID.toBytes(),
          NATIVE_MINT.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

    const assoicatedTokenAccountInfo = await SOLANA_CONNECTION.getAccountInfo(
      associatedNativeSolTokenAddress
    );

    const totalAmountToBeSent =
      3 * LAMPORTS_PER_SOL +
      (await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        AccountLayout.span
      ));

    if (!assoicatedTokenAccountInfo) {
      console.log(
        `Creating wSOL associated account at ${(
          await associatedNativeSolTokenAddress
        ).toString()}`
      );

      const createWrapSolTX = await createAndWrapSOL(
        totalAmountToBeSent,
        new PublicKey(publicKey),
        associatedNativeSolTokenAddress
      );

      console.log(new PublicKey(publicKey));

      console.log("Create Wrap Successfully");

      res.json({
        success: true,
        data: {
          tx: createWrapSolTX,
        },
      });
      return;
    } else {
      console.log(
        "Since the associated token already exists, invoking whitelist WrapSOL"
      );
      const wrapSolTX = await wrapSOL(
        totalAmountToBeSent,
        new PublicKey(publicKey),
        associatedNativeSolTokenAddress
      );

      console.log(new PublicKey(publicKey));
      console.log(wrapSolTX);

      console.log("Wrap Successfully");

      res.json({
        success: true,
        data: {
          tx: wrapSolTX,
        },
      });
      return;
    }
  } catch (error) {
    console.log("An Error Occurred: ", error);

    res.json({
      success: false,
      data: null,
      error,
    });
  }
}

async function createAndWrapSOL(
  amount: number,
  owner: PublicKey,
  tokenAccount: PublicKey
) {
  const instructionData = Buffer.from(
    Uint8Array.of(1, ...new BN(amount).toArray("le", 8))
  );

  const createAndWrapSOLIx = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: true, pubkey: owner },
      {
        isWritable: true,
        isSigner: false,
        pubkey: tokenAccount,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: NATIVE_MINT,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: SYSTEM_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: TOKEN_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: SYSVAR_RENT_PUBKEY,
      },
    ],
    programId: WHITELIST_PROGRAM_ID,
    data: instructionData,
  });

  // const tx = new Transaction().add(createAndWrapSOLIx);

  return createAndWrapSOLIx;
}

async function wrapSOL(
  amount: number,
  owner: PublicKey,
  tokenAccount: PublicKey
) {
  const instructionData = Buffer.from(
    Uint8Array.of(1, ...new BN(amount).toArray("le", 8))
  );

  const wrapSOLIx = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: true, pubkey: owner },
      { isWritable: true, isSigner: false, pubkey: tokenAccount },
      {
        isWritable: false,
        isSigner: false,
        pubkey: NATIVE_MINT,
      },
      { isSigner: false, isWritable: false, pubkey: SYSTEM_PROGRAM_ID },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
      {
        isWritable: false,
        isSigner: false,
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      },
    ],
    programId: WHITELIST_PROGRAM_ID,
    data: instructionData,
  });

  // const tx = new Transaction().add(wrapSOLIx);

  return wrapSOLIx;
}
