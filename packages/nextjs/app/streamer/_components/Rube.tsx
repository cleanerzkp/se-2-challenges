import { type FC, useEffect, useRef, useState } from "react";
import { STREAM_ETH_VALUE } from "./Guru";
import humanizeDuration from "humanize-duration";
import { Address as AddressType, createTestClient, encodePacked, http, keccak256, parseEther, toBytes } from "viem";
import { hardhat } from "viem/chains";
import { useAccount, useSignMessage } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ETH_PER_CHARACTER = "0.01";

type RubeProps = {
  challenged: Array<AddressType>;
  closed: Array<AddressType>;
  writable: Array<AddressType>;
};

export const Rube: FC<RubeProps> = ({ challenged, closed, writable }) => {
  const userChannel = useRef<BroadcastChannel>();
  const { address: userAddress } = useAccount();
  const [autoPay, setAutoPay] = useState(true);
  const [receivedWisdom, setReceivedWisdom] = useState("");
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync: writeStreamerContractAsync } = useScaffoldWriteContract("Streamer");

  const { data: timeLeft } = useScaffoldReadContract({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [userAddress],
    watch: true,
  });

  useEffect(() => {
    if (userAddress) {
      userChannel.current = new BroadcastChannel(userAddress);
    }
  }, [userAddress]);

  async function reimburseService(wisdom: string) {
    const initialBalance = parseEther(STREAM_ETH_VALUE);
    const costPerCharacter = parseEther(ETH_PER_CHARACTER);
    const duePayment = costPerCharacter * BigInt(wisdom.length);

    let updatedBalance = initialBalance - duePayment;

    if (updatedBalance < 0n) {
      updatedBalance = 0n;
    }

    const packed = encodePacked(["uint256"], [updatedBalance]);
    const hashed = keccak256(packed);
    const arrayified = toBytes(hashed);

    let signature;
    try {
      signature = await signMessageAsync({ message: { raw: arrayified } });
    } catch (err) {
      console.error("signMessageAsync error", err);
    }

    const hexBalance = updatedBalance.toString(16);

    if (hexBalance && signature) {
      userChannel.current?.postMessage({
        updatedBalance: hexBalance,
        signature,
      });
    }
  }

  if (userChannel.current) {
    userChannel.current.onmessage = e => {
      if (typeof e.data != "string") {
        console.warn(`received unexpected channel data: ${JSON.stringify(e.data)}`);
        return;
      }

      setReceivedWisdom(e.data);

      if (autoPay) {
        reimburseService(e.data);
      }
    };
  }

  return (
    <>
      <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Rube!</p>

      {userAddress && writable.includes(userAddress) ? (
        <div className="w-full flex flex-col items-center">
          <span className="mt-6 text-lg font-semibold">Autopay</span>
          <div className="flex items-center mt-2 gap-2">
            <span>Off</span>
            <input
              type="checkbox"
              className="toggle toggle-secondary bg-secondary"
              defaultChecked={autoPay}
              onChange={e => {
                const updatedAutoPay = e.target.checked;
                setAutoPay(updatedAutoPay);

                if (updatedAutoPay) {
                  reimburseService(receivedWisdom);
                }
              }}
            />
            <span>On</span>
          </div>

          <div className="text-center w-full mt-4">
            <p className="text-xl font-semibold">Received Wisdom</p>
            <p className="mb-3 text-lg min-h

-[1.75rem] border-2 border-primary rounded">{receivedWisdom}</p>
          </div>

          {/* Checkpoint 5: challenge & closure */}
          <div className="flex flex-col items-center pb-6">
            <button
              disabled={challenged.includes(userAddress)}
              className="btn btn-primary"
              onClick={async () => {
                setAutoPay(false);

                try {
                  await writeStreamerContractAsync({ functionName: "challengeChannel" });
                } catch (err) {
                  console.error("Error calling challengeChannel function");
                }

                try {
                  createTestClient({
                    chain: hardhat,
                    mode: "hardhat",
                    transport: http(),
                  })?.setIntervalMining({
                    interval: 5,
                  });
                } catch (e) {}
              }}
            >
              Challenge this channel
            </button>

            <div className="p-2 mt-6 h-10">
              {challenged.includes(userAddress) && !!timeLeft && (
                <>
                  <span>Time left:</span> {humanizeDuration(Number(timeLeft) * 1000)}
                </>
              )}
            </div>
            <button
              className="btn btn-primary"
              disabled={!challenged.includes(userAddress) || !!timeLeft}
              onClick={async () => {
                try {
                  await writeStreamerContractAsync({ functionName: "defundChannel" });
                } catch (err) {
                  console.error("Error calling defundChannel function");
                }
              }}
            >
              Close and withdraw funds
            </button>
          </div>
        </div>
      ) : userAddress && closed.includes(userAddress) ? (
        <div className="text-lg">
          <p>Thanks for stopping by - we hope you have enjoyed the guru&apos;s advice.</p>
          <p className="mt-8">
            This UI obstructs you from opening a second channel. Why? Is it safe to open another channel?
          </p>
        </div>
      ) : (
        <div className="p-2">
          <button
            className="btn btn-primary"
            onClick={async () => {
              try {
                await writeStreamerContractAsync({
                  functionName: "fundChannel",
                  value: parseEther(STREAM_ETH_VALUE),
                });
              } catch (err) {
                console.error("Error calling fundChannel function");
              }
            }}
          >
            Open a 0.5 ETH channel for advice from the Guru
          </button>
        </div>
      )}
    </>
  );
};