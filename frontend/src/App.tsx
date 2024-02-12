/* eslint-disable @typescript-eslint/no-explicit-any */
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const API_URL = "http://localhost:3000";

function getPrice() {
  return fetch(`${API_URL}/price`)
    .then((res) => res.json())
    .then((res) => {
      return res.data;
    });
}

async function swap(publicKey: string, tempAuthTokenAccount: Record<any, any>) {
  return fetch(`${API_URL}/swap`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey,
      tempAuthTokenAccount,
    }),
  }).then((res) => res.json());
}

// async function wrapSol(publicKey: string) {
//   return fetch(`${API_URL}/wrapSol`, {
//     method: "post",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       publicKey
//     }),
//   }).then((res) => res.json());
// }

async function approveSwap(publicKey: string) {
  return fetch(`${API_URL}/approveSwap`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey,
    }),
  }).then((res) => res.json());
}

// Default styles that can be overridden by your app
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
// import base58 from "bs58";

function App() {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    getPrice().then((data: any) => {
      setPrice(data?.price);
    });
  }, []);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      if (!publicKey) throw new WalletNotConnectedError();

      // const wrapIx: any = await wrapSol(publicKey.toString());

      // console.log(wrapIx);

      // const wrapKeys = wrapIx.data.tx.keys.map((k: Record<any, any>) => ({
      //   ...k,
      //   pubkey: new PublicKey(k.pubkey),
      // }));

      // const wrapInst = {
      //   keys: wrapKeys,
      //   programId: new PublicKey(wrapIx.data.tx.programId),
      //   data: wrapIx.data.tx.data,
      // };

      // const wrapTx = new Transaction().add(wrapInst);
      // wrapTx.recentBlockhash = (
      //   await connection.getLatestBlockhash("finalized")
      // ).blockhash;

      // wrapTx.feePayer = publicKey;

      // await sendTransaction(wrapTx, connection, {
      //   skipPreflight: true,
      //   preflightCommitment: "confirmed",
      // });

      // console.log("WRAP SUCCESS 😭");

      const privateKey: number[] = [
        58, 130, 35, 213, 22, 225, 16, 255, 248, 50, 4, 99, 193, 89, 219, 39, 208,
        208, 229, 72, 118, 212, 243, 242, 117, 95, 92, 8, 143, 224, 135, 234, 30, 135,
        116, 227, 31, 189, 124, 88, 169, 110, 62, 87, 134, 150, 98, 102, 79, 231, 179,
        195, 185, 226, 180, 137, 183, 202, 11, 115, 253, 0, 180, 188
      ];

      const privateKeyHex: string = Buffer.from(privateKey).toString('hex');


      const keypair = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKeyHex, 'hex')));

      const approveData: any = await approveSwap(publicKey.toString());

      const tempAuthTokenAccount = Keypair.fromSecretKey(
        new Uint8Array(
          Object.values(
            approveData.data.tempAuthTokenAccount._keypair.secretKey
          )
        )
      );

      console.log(approveData.data.price_per);

      console.log("user: ", publicKey);

      const [associatedNativeSolTokenAddress] =
        await PublicKey.findProgramAddress(
          [
            publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBytes(),
            NATIVE_MINT.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

      const apTx = new Transaction().add(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          associatedNativeSolTokenAddress,
          tempAuthTokenAccount.publicKey,
          keypair.publicKey,
          [],
          approveData.data.price_per
        )
      );

      await sendTransaction(apTx, connection);

      console.log(" tempAuthTokenAccount:", tempAuthTokenAccount.publicKey);

      const swapIxs: any = await swap(
        publicKey.toString(),
        tempAuthTokenAccount.publicKey
      );

      const initWhitelistUserStateIx = swapIxs.data.initWhitelistUserStateIx;

      const whitelistUserStateAccount = Keypair.fromSecretKey(
        new Uint8Array(
          Object.values(
            swapIxs.data.whitelistUserStateAccount._keypair.secretKey
          )
        )
      );

      const swapInitWhitelistUserStateIxKeys =
        initWhitelistUserStateIx.keys.map((k: Record<any, any>) => ({
          ...k,
          pubkey: new PublicKey(k.pubkey),
        }));

      const swapInitWhitelistUserStateIxInst = {
        keys: swapInitWhitelistUserStateIxKeys,
        programId: new PublicKey(initWhitelistUserStateIx.programId),
        data: initWhitelistUserStateIx.data,
      };

      const swapSOLForSPLIx = swapIxs.data.swapSOLForSPLIx;

      const swapSOLForSPLIxKeys = swapSOLForSPLIx.keys.map(
        (k: Record<any, any>) => ({
          ...k,
          pubkey: new PublicKey(k.pubkey),
        })
      );

      const swapSOLForSPLIxInst = {
        keys: swapSOLForSPLIxKeys,
        programId: new PublicKey(swapSOLForSPLIx.programId),
        data: swapSOLForSPLIx.data,
      };

      console.log(swapSOLForSPLIxInst);

      const swapTransaction = new Transaction().add(
        swapInitWhitelistUserStateIxInst,
        swapSOLForSPLIxInst
      );

      swapTransaction.recentBlockhash = (
        await connection.getLatestBlockhash("finalized")
      ).blockhash;

      swapTransaction.feePayer = publicKey;

      if (signTransaction) {
        {
          swapTransaction.partialSign(tempAuthTokenAccount);
          swapTransaction.partialSign(whitelistUserStateAccount);
          swapTransaction.partialSign(keypair);
          console.log(keypair)
          console.log(tempAuthTokenAccount)
          console.log(whitelistUserStateAccount)

          // const signedTx = await signTransaction(swapTransaction);

          // console.log(signedTx.signatures[0].publicKey.toString());
          // console.log(signedTx.signatures[1].publicKey.toString());
          // console.log(signedTx.signatures[2].publicKey.toString());

          const confirmTransaction = await connection.sendRawTransaction(
            swapTransaction.serialize()
          );

          console.log(`Transaction sent with signature: ${confirmTransaction}`);

          // sendTransaction(signa, connection, {
          //   skipPreflight: true,
          //   preflightCommitment: "confirmed",
          // });

          // await connection.sendTransaction(
          //   signa,
          //   [keypair, tempAuthTokenAccount, whitelistUserStateAccount],
          //   {
          //     skipPreflight: true,
          //     preflightCommitment: "confirmed",
          //   }
          // );

          // await SOLANA_CONNECTION.sendTransaction(
          //   swapTransaction,
          //   [user, whitelistUserStateAccount, tempAuthTokenAccount],
          //   {
          //     preflightCommitment: "confirmed",
          //     skipPreflight: false,
          //   }
          // );

          console.log("SWAP SUCCESS 😭");
        }
      }
    },
    [publicKey, connection, sendTransaction, signTransaction]
  );

  return (
    <div className="bg-slate-950 w-full min-h-screen flex flex-col items-center justify-center gap-10 text-white px-5">
      <WalletModalButton
        // id="connectButton"
        className="fixed top-0 right-0 bg-white text-black rounded-3xl p-3 px-6 text-sm font-medium m-5"
      >
        Connect Wallet
      </WalletModalButton>
      <form
        onSubmit={handleSubmit}
        id="swapForm"
        className="bg-gradient-to-br from-indigo-950 to-slate-950 border-2 border-b-violet-600 border-r-violet-700 border-violet-700 rounded-2xl p-5 max-w-[30rem] w-full flex flex-col gap-5 items-center"
      >
        <div className="flex flex-col gap-2 w-full bg-slate-950/50 backdrop-blur-xl p-5 rounded-2xl">
          <div className="text-xs flex items-center justify-between text-indigo-200">
            <div>From</div>
            <div>Balance: (Wallet not connected)</div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-4">
              <div className="bg-slate-700 p-1 rounded-full">
                <img
                  src="https://img.raydium.io/icon/So11111111111111111111111111111111111111112.png"
                  alt="sol"
                  className="w-8 aspect-square rounded-full"
                />
              </div>
              <div className="font-semibold text-xl text-indigo-200">SOL</div>
            </div>
            <div className="flex-1">
              <input
                id="fromValue"
                type="number"
                placeholder="0"
                className="p-2 bg-transparent w-full text-right text-3xl font-medium font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
        <svg
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          className="fill-indigo-100 w-10"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            <title>swap-vertical-circle-solid</title>
            <g id="Layer_2" data-name="Layer 2">
              <g id="invisible_box" data-name="invisible box">
                <rect width="48" height="48" fill="none"></rect>
              </g>
              <g id="icons_Q2" data-name="icons Q2">
                <path d="M24,2A22,22,0,1,0,46,24,21.9,21.9,0,0,0,24,2Zm.3,29.5-4.9,4.9a1.9,1.9,0,0,1-2.8,0l-4.9-4.9a2.2,2.2,0,0,1-.4-2.7,2,2,0,0,1,3.1-.2L16,30.2V15a2,2,0,0,1,4,0V30.2l1.6-1.6a2,2,0,0,1,3.1.2A2.2,2.2,0,0,1,24.3,31.5ZM36.7,19.2a2,2,0,0,1-3.1.2L32,17.8V33a2,2,0,0,1-4,0V17.8l-1.6,1.6a2,2,0,0,1-3.1-.2,2.1,2.1,0,0,1,.4-2.7l4.9-4.9a1.9,1.9,0,0,1,2.8,0l4.9,4.9A2.1,2.1,0,0,1,36.7,19.2Z"></path>
              </g>
            </g>
          </g>
        </svg>
        <div className="flex flex-col gap-2 w-full bg-slate-950/50 backdrop-blur-xl p-5 rounded-2xl">
          <div className="text-xs flex items-center justify-between text-indigo-200">
            <div>To</div>
            <div id="rate">1 Token ~ {price} SOL</div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-4">
              <div className="bg-slate-700 p-1 rounded-full">
                <img
                  src="https://img.raydium.io/icon/So11111111111111111111111111111111111111112.png"
                  alt="sol"
                  className="w-8 aspect-square rounded-full"
                />
              </div>
              <div className="font-semibold text-xl text-indigo-200">Token</div>
            </div>
            <div className="flex-1">
              <input
                id="toValue"
                readOnly
                type="number"
                placeholder="0"
                className="p-2 bg-transparent w-full text-right text-3xl font-medium font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
        <button className="p-4 bg-indigo-700 w-full rounded-3xl border-2 border-violet-500">
          Swap
        </button>
      </form>
    </div>
  );
}

export default App;
