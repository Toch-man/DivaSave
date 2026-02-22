"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";

export default function Vault() {
  const [selected_token, set_selected_token] = useState();
  const [account, set_account] = useState();
  const [balance, set_balance] = useState();

  const { writeContract } = useWriteContract();

  //read vault balance

  useEffect(() => {
    // set balance to vault balance
  }, []);
  return (
    <div>
      <h1>Savings</h1>
      <div></div>
    </div>
  );
}
