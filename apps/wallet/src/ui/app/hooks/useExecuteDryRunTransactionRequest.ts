// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getTotalGasUsed } from '@mysten/sui.js';
import { useQuery } from '@tanstack/react-query';

import { notEmpty } from '_helpers';
import { useSigner } from '_hooks';

import type {
    Base64DataBuffer,
    SignableTransaction,
    TransactionEffects,
} from '@mysten/sui.js';

export type CoinsMetaProps = {
    amount: number;
    coinType: string;
    receiverAddress: string;
};

export type TxnMetaResponse = {
    objectIDs: string[];
    coins: CoinsMetaProps[];
};

const getEventsSummary = (
    txEffects: TransactionEffects,
    address: string
): TxnMetaResponse => {
    const events = txEffects?.events || [];

    const coinsMeta = events
        .map((event) => {
            if (
                !('coinBalanceChange' in event) ||
                ['Receive', 'Pay'].includes(
                    event?.coinBalanceChange?.changeType
                )
            ) {
                return null;
            }
            /// Combine all the coin balance changes from Pay and Receive events
            /// A net positive amount means the user received coins
            /// A net negative amount means the user sent coins
            const { coinBalanceChange } = event;
            const { coinType, amount, coinObjectId, owner } = coinBalanceChange;
            const { AddressOwner } = owner as { AddressOwner: string };
            const { ObjectOwner } = owner as { ObjectOwner: string };

            if (ObjectOwner) {
                return null;
            }

            return {
                amount: amount,
                coinType: coinType,
                coinObjectId: coinObjectId,
                receiverAddress: AddressOwner,
            };
        })
        .filter(notEmpty);

    const objectIDs: string[] = events

        .map((event) => {
            if (!('transferObject' in event)) {
                return null;
            }
            const { transferObject } = event;
            const { AddressOwner } = transferObject.recipient as {
                AddressOwner: string;
            };
            if (AddressOwner !== address) {
                return null;
            }
            return transferObject?.objectId;
        })
        .filter(notEmpty);

    /// Group coins by receiverAddress
    // sum coins by coinType for each receiverAddress
    const meta = coinsMeta.reduce((acc, value, _) => {
        return {
            ...acc,
            [`${value.receiverAddress}${value.coinType}`]: {
                amount:
                    value.amount +
                    (acc[`${value.receiverAddress}${value.coinType}`]?.amount ||
                        0),
                coinType: value.coinType,
                receiverAddress: value.receiverAddress,
            },
        };
    }, {} as { [coinType: string]: CoinsMetaProps });

    return {
        objectIDs,
        coins: Object.values(meta),
    };
};

type TxData = string | SignableTransaction | Base64DataBuffer;

type ExecuteDryRunTransactionRequestProps = {
    txData: TxData;
    id: string;
    activeAddress: string;
};

interface ExecuteDryRunTransactionReqResponse {
    txRequestID: string;
    txnMeta?: TxnMetaResponse;
    txGasEstimation?: number;
}
export function useExecuteDryRunTransactionRequest(txData: TxData) {
    const signer = useSigner();

    const response = useQuery(['executedryRunTxn'], async () => {
        return signer.dryRunTransaction(txData);
    });

    return response;
}

export function useGetRequestTxnMeta({
    txData,
    id,
    activeAddress,
}: ExecuteDryRunTransactionRequestProps): ExecuteDryRunTransactionReqResponse | null {

    const { data } = useExecuteDryRunTransactionRequest(txData);

    const txnMeta = data ? getEventsSummary(data, activeAddress) : null;
    const txGasEstimation = data && getTotalGasUsed(data);

    return {
        txRequestID: id,
        ...(txnMeta && { txnMeta }),
        ...(txGasEstimation && { txGasEstimation }),
    };
}