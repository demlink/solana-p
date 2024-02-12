import { PublicKey } from "@metaplex-foundation/js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKEN_SWAP_PROGRAM_ID } from "@solana/spl-token-swap";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { Request, Response } from "express";
import {
  PRICE_PER_TOKEN_B,
  SOLANA_CONNECTION,
  TOKEN_SWAP_FEE_OWNER,
  WHITELIST_PROGRAM_ID,
} from "../constants";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  getPublicKey,
  getTokenAccount,
  storeKeypair,
  // storeTokenAccount,
} from "../utils/file";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token-v3";
import { getWhiteListUserStateLayout } from "../utils/layout";

export async function checkForPreRequisites(publicKey: string) {
  if (!(await checkKeysDir())) {
    throw new Error(
      "Keys directory does not exist. Please run yarn storeaddress to generate all addresses"
    );
  }

  const whitelistCreator = await getKeyPair("whitelistCreator", "persons");
  let whitelistUserStateAccount = await getKeyPair("whiteListUser", "state");

  if (!publicKey || !whitelistCreator || !whitelistUserStateAccount) {
    throw new Error("Required person/state accounts doesn't exist");
  }

  if (
    await SOLANA_CONNECTION.getAccountInfo(whitelistUserStateAccount.publicKey)
  ) {
    whitelistUserStateAccount = await storeKeypair(
      "whiteListUser",
      "state",
      true
    );
  }

  if (!whitelistUserStateAccount) {
    throw new Error("Whitelist User state account not found");
  }

  const wlstMintAccount = await getMintToken("wlst", whitelistCreator);
  const wsolMintAccount = await getMintToken("wsol", whitelistCreator);

  if (!wlstMintAccount || !wsolMintAccount) {
    throw new Error("SPL Token Mint missing. Please run yarn createmint");
  }

  const poolWsolTokenAccount = await getTokenAccount(
    "whitelistCreator",
    "wsol"
  );
  const poolWlstTokenAccount = await getTokenAccount(
    "whitelistCreator",
    "wlst"
  );

  if (!poolWsolTokenAccount || !poolWlstTokenAccount) {
    throw new Error(
      "Whitelist Token X and Y accounts doesn't exist. Please run yarn createtoken to create token accounts"
    );
  }

  const tokenSwapStateAccount = await getPublicKey("tokenSwap", "state");

  if (!tokenSwapStateAccount) {
    throw new Error(
      "Token Swap State Account missing. Please run yarn createpool"
    );
  }

  let swapAuthorityPDA = await getPublicKey("swapAuthority");
  const poolFeeTokenAccount = await getTokenAccount(
    "swapProgramOwner",
    "poolFee"
  );

  if (!swapAuthorityPDA) {
    [swapAuthorityPDA] = await PublicKey.findProgramAddress(
      [tokenSwapStateAccount.toBytes()],
      TOKEN_SWAP_PROGRAM_ID
    );
  }

  if (!poolFeeTokenAccount) {
    throw new Error(
      "Pool Fee Token Account missing. Please run yarn createpool to generate PDA"
    );
  }

  const poolMintToken = await getMintToken(
    "pool",
    new Keypair({
      publicKey: swapAuthorityPDA.toBytes(),
      secretKey: Buffer.from(""),
    })
  );

  if (!poolMintToken) {
    throw new Error(
      "Pool Mint Token doesn't exist. Please run yarn createpool"
    );
  }

  const whitelistGlobalStateAccount = await getPublicKey("whiteList", "state");

  if (!whitelistGlobalStateAccount) {
    throw new Error(
      "Whitelist Global State Account missing. Please run yarn initpda"
    );
  }

  const userNativeSolTokenAccount = await getTokenAccount("user", "wsol");

  if (!userNativeSolTokenAccount) {
    throw new Error(
      "User doesn't have a native SOL associated Token account. Please run yarn wrapsol"
    );
  }

  return {
    user: publicKey,
    userNativeSolTokenAccount,
    whitelistCreator,
    wlstMintAccount,
    wsolMintAccount,
    poolWsolTokenAccount,
    poolWlstTokenAccount,
    swapAuthorityPDA,
    poolFeeTokenAccount,
    poolMintToken,
    tokenSwapStateAccount,
    whitelistGlobalStateAccount,
    whitelistUserStateAccount,
  };
}

export default async function swap(req: Request, res: Response) {
  try {
    const { publicKey, tempAuthTokenAccount } = req.body;
    const {
      user,
      wlstMintAccount,
      tokenSwapStateAccount,
      userNativeSolTokenAccount,
      swapAuthorityPDA,
      whitelistUserStateAccount,
      whitelistGlobalStateAccount,
      poolWlstTokenAccount,
      poolWsolTokenAccount,
      poolMintToken,
      poolFeeTokenAccount,
    } = await checkForPreRequisites(publicKey);

    // const userWlstTokenAccount =
    //   await wlstMintAccount.getOrCreateAssociatedAccountInfo(
    //     new PublicKey(publicKey)
    //   );

    const userWlstTokenAccount = await getOrCreateAssociatedTokenAccount(
      SOLANA_CONNECTION,
      (await getKeyPair("whitelistCreator", "persons"))!,
      wlstMintAccount.publicKey,
      new PublicKey(publicKey)
    );

    console.log(userWlstTokenAccount);

    // Instruction phase
    const WHITELIST_USER_STATE_LAYOUT = getWhiteListUserStateLayout();

    const initWhitelistUserStateIx = SystemProgram.createAccount({
      fromPubkey: new PublicKey(user),
      lamports: await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        WHITELIST_USER_STATE_LAYOUT.span
      ),
      newAccountPubkey: whitelistUserStateAccount.publicKey,
      programId: WHITELIST_PROGRAM_ID,
      space: WHITELIST_USER_STATE_LAYOUT.span,
    });

    const tempAuthTokenAccountPub = new PublicKey(tempAuthTokenAccount);

    console.log("tempAuthTokenAccountPub:", tempAuthTokenAccountPub);

    const swapSOLForSPLIx = new TransactionInstruction({
      keys: [
        {
          isSigner: true,
          isWritable: false,
          pubkey: new PublicKey(user),
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: whitelistUserStateAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: whitelistGlobalStateAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: tokenSwapStateAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: swapAuthorityPDA,
        },
        {
          isSigner: true,
          isWritable: false,
          pubkey: tempAuthTokenAccountPub,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: userNativeSolTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: userWlstTokenAccount.address,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolWsolTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolWlstTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolMintToken.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolFeeTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: TOKEN_SWAP_FEE_OWNER,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: TOKEN_PROGRAM_ID,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: TOKEN_SWAP_PROGRAM_ID,
        },
      ],
      programId: WHITELIST_PROGRAM_ID,
      data: Buffer.from([
        4,
        ...new BN(PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL).toArray("le", 8),
        ...new BN(1 * 10 ** 2).toArray("le", 8),
      ]),
    });

    res.json({
      success: true,
      data: {
        initWhitelistUserStateIx,
        whitelistUserStateAccount,
        swapSOLForSPLIx,
      },
    });
    return;
  } catch (error) {
    console.log("An Error Occurred: ", error);

    res.json({
      success: false,
      data: null,
      error,
    });
  }
}
