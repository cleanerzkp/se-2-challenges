import { type FC, useEffect, useState } from "react";
import { CashOutVoucherButton } from "./CashOutVoucherButton";
import { Address as AddressType, encodePacked, formatEther, keccak256, parseEther, toBytes, verifyMessage } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useWatchBalance } from "~~/hooks/scaffold-eth";

export const STREAM_ETH_VALUE = "0.5";

export type Voucher = { updatedBalance: bigint; signature: `0x${string}}` };

type GuruProps = {
  challenged: Array<AddressType>;
  closed: Array<AddressType>;
  opened: Array<AddressType>;
  writable: Array<AddressType>;
};

export const Guru: FC<GuruProps> = ({ challenged, closed, opened, writable }) => {
  const { data: deployedContractData } = useDeployedContractInfo("Streamer");
  const { data: balance } = useWatchBalance({ address: deployedContractData?.address });

  const [wisdoms, setWisdoms] = useState<{ [key: AddressType]: string }>({});
  const [vouchers, setVouchers] = useState<{ [key: AddressType]: Voucher }>({});
  const [unpaidClients, setUnpaidClients] = useState<AddressType[]>([]);

  // channels
  const [channels, setChannels] = useState<{ [key: AddressType]: BroadcastChannel }>({});

  useEffect(() => {
    const newChannels: { [key: string]: BroadcastChannel } = {};

    opened.forEach(openedChannel => {
      if (!channels[openedChannel]) {
        newChannels[openedChannel] = new BroadcastChannel(openedChannel);
      }
    });

    if (Object.keys(newChannels).length > 0) {
      setChannels({
        ...channels,
        ...newChannels,
      });
    }
  }, [channels, opened]);

  Object.keys(channels)?.forEach(clientAddress => {
    channels[clientAddress].onmessage = receiveVoucher(clientAddress);
  });

  const provideService = (client: AddressType, wisdom: string) => {
    // Check if the client has an existing voucher
    const existingVoucher = vouchers[client];
  
    // If the client has an existing voucher and their updated balance is 0,
    // it means they haven't paid for the previous service
    if (existingVoucher && existingVoucher.updatedBalance === 0n) {
      console.warn(`Client ${client} has not paid for previous service. Refusing to provide new service.`);
      if (!unpaidClients.includes(client)) {
        setUnpaidClients([...unpaidClients, client]);
      }
      return;
    }
  
    // Remove client from unpaid clients list if they pay
    setUnpaidClients(unpaidClients.filter(addr => addr !== client));
  
    // Update the wisdom and send it to the client
    setWisdoms({ ...wisdoms, [client]: wisdom });
    channels[client]?.postMessage(wisdom);
  };

  /**
   * wraps a voucher processing function for each client.
   */
  function receiveVoucher(clientAddress: string) {
    /**
     * Handle incoming payments from the given client.
     */
    async function processVoucher({ data }: { data: Pick<Voucher, "signature"> & { updatedBalance: string } }) {
      // recreate a bigint object from the message. v.data.updatedBalance is
      // a string representation of the bigint for transit over the network
      if (!data.updatedBalance) {
        return;
      }
      const updatedBalance = BigInt(`0x${data.updatedBalance}`);
      const packed = encodePacked(["uint256"], [updatedBalance]);
      const hashed = keccak256(packed);
      const arrayified = toBytes(hashed);

      // Verify the signature
      let isValid = false;
      try {
        isValid = await verifyMessage({
          address: clientAddress,
          message: { raw: arrayified },
          signature: data.signature,
        });
      } catch (err) {
        console.error("verifyMessage error", err);
      }

      if (!isValid) {
        console.error("Voucher signature verification failed");
        return;
      }

      const existingVoucher = vouchers[clientAddress];

      // update our stored voucher if this new one is more valuable
      if (existingVoucher === undefined || updatedBalance < existingVoucher.updatedBalance) {
        setVouchers(vouchers => ({ ...vouchers, [clientAddress]: { ...data, updatedBalance } }));
      }
    }

    return processVoucher;
  }

  return (
    <>
      <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Guru!</p>
      <p className="block text-xl mt-0 mb-1 font-semibold">
        You have {writable.length} channel{writable.length == 1 ? "" : "s"} open
      </p>
      <p className="mt-0 text-lg text-center font-semibold">
        Total ETH locked: {Number(formatEther(balance?.value || 0n)).toFixed(4)} ETH
      </p>
      <div className="mt-4 text-lg">
        Channels with <button className="btn btn-sm btn-error">RED</button> withdrawal buttons are under challenge
        on-chain, and should be redeemed ASAP.
      </div>
      <div className="mt-4 w-full flex flex-col">
        {writable.map(clientAddress => (
          <div key={clientAddress} className="w-full flex flex-col border-primary border-t py-6">
            <Address address={clientAddress} size="xl" />
            {unpaidClients.includes(clientAddress) && (
              <div className="alert alert-warning mt-3">
                Client has not paid for previous service. Refusing to provide new service.
              </div>
            )}
            <textarea
              className="mt-3 bg-base-200"
              rows={3}
              placeholder="Provide your wisdom here..."
              onChange={e => {
                e.stopPropagation();
                const updatedWisdom = e.target.value;
                provideService(clientAddress, updatedWisdom);
              }}
              value={wisdoms[clientAddress]}
            />

            <div className="mt-2 flex justify-between">
              <div>
                Served: <strong>{wisdoms[clientAddress]?.length || 0}</strong>&nbsp;chars
              </div>
              <div>
                Received:{" "}
                <strong id={`claimable-${clientAddress}`}>
                  {vouchers[clientAddress]
                    ? formatEther(parseEther(STREAM_ETH_VALUE) - vouchers[clientAddress].updatedBalance)
                    : 0}
                </strong>
                &nbsp;ETH
              </div>
            </div>

            {/* Checkpoint 4: */}
            {/* <CashOutVoucherButton
              key={clientAddress}
              clientAddress={clientAddress}
              challenged={challenged}
              closed={closed}
              voucher={vouchers[clientAddress]}
            /> */}
          </div>
        ))}
      </div>
    </>
  );
};
