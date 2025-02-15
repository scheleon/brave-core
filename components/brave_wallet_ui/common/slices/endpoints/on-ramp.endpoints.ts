// Copyright (c) 2023 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

// Types
import {
  BraveWallet,
  SupportedOnRampNetworks,
} from '../../../constants/types'
import {
  WalletApiEndpointBuilderParams
} from '../api-base.slice'

// Utils
import {
  getBatTokensFromList,
  getNativeTokensFromList,
  getUniqueAssets
} from '../../../utils/asset-utils'
import { addLogoToToken } from '../../async/lib'
import { mapLimit } from 'async'

export const onRampEndpoints = ({
  query
}: WalletApiEndpointBuilderParams) => {
  return {
    getOnRampAssets: query<
      {
        rampAssetOptions: BraveWallet.BlockchainToken[]
        sardineAssetOptions: BraveWallet.BlockchainToken[]
        transakAssetOptions: BraveWallet.BlockchainToken[]
        stripeAssetOptions: BraveWallet.BlockchainToken[]
        allAssetOptions: BraveWallet.BlockchainToken[]
      },
      void
    >({
      queryFn: async (_arg, _store, _extraOptions, baseQuery) => {
        try {
          const {
            data: { blockchainRegistry }
          } = baseQuery(undefined)
          const { kRamp, kSardine, kTransak, kStripe } =
            BraveWallet.OnRampProvider

          const rampAssets = await mapLimit(
            SupportedOnRampNetworks,
            10,
            async (chainId: string) =>
              await blockchainRegistry.getBuyTokens(kRamp, chainId)
          )

          const sardineAssets = await mapLimit(
            SupportedOnRampNetworks,
            10,
            async (chainId: string) =>
              await blockchainRegistry.getBuyTokens(kSardine, chainId)
          )

          const transakAssets = await mapLimit(
            SupportedOnRampNetworks,
            10,
            async (chainId: string) =>
              await blockchainRegistry.getBuyTokens(kTransak, chainId)
          )
          const stripeAssets = await mapLimit(
            SupportedOnRampNetworks,
            10,
            async (chainId: string) =>
              await blockchainRegistry.getBuyTokens(kStripe, chainId)
          )

          // add token logos
          const rampAssetOptions: BraveWallet.BlockchainToken[] =
            await mapLimit(
              rampAssets.flatMap((p) => p.tokens),
              10,
              async (token: BraveWallet.BlockchainToken) =>
                await addLogoToToken(token)
            )

          const sardineAssetOptions: BraveWallet.BlockchainToken[] =
            await mapLimit(
              sardineAssets.flatMap((p) => p.tokens),
              10,
              async (token: BraveWallet.BlockchainToken) =>
                await addLogoToToken(token)
            )

          const transakAssetOptions: BraveWallet.BlockchainToken[] =
            await mapLimit(
              transakAssets.flatMap((p) => p.tokens),
              10,
              async (token: BraveWallet.BlockchainToken) =>
                await addLogoToToken(token)
            )

          const stripeAssetOptions: BraveWallet.BlockchainToken[] =
            await mapLimit(
              stripeAssets.flatMap((p) => p.tokens),
              10,
              async (token: BraveWallet.BlockchainToken) =>
                await addLogoToToken(token)
            )

          // separate native assets from tokens
          const {
            tokens: rampTokenOptions,
            nativeAssets: rampNativeAssetOptions
          } = getNativeTokensFromList(rampAssetOptions)

          const {
            tokens: sardineTokenOptions,
            nativeAssets: sardineNativeAssetOptions
          } = getNativeTokensFromList(sardineAssetOptions)

          const {
            tokens: transakTokenOptions,
            nativeAssets: transakNativeAssetOptions
          } = getNativeTokensFromList(transakAssetOptions)

          const {
            tokens: stripeTokenOptions,
            nativeAssets: stripeNativeAssetOptions
          } = getNativeTokensFromList(stripeAssetOptions)

          // separate BAT from other tokens
          const {
            bat: rampBatTokens,
            nonBat: rampNonBatTokens
          } = getBatTokensFromList(rampTokenOptions)

          const {
            bat: sardineBatTokens,
            nonBat: sardineNonBatTokens
          } = getBatTokensFromList(sardineTokenOptions)

          const {
            bat: transakBatTokens,
            nonBat: transakNonBatTokens
          } = getBatTokensFromList(transakTokenOptions)

          const {
            bat: stripeBatTokens,
            nonBat: stripeNonBatTokens
          } = getBatTokensFromList(stripeTokenOptions)

          // sort lists
          // Move Gas coins and BAT to front of list
          const sortedRampOptions =
            [
              ...rampNativeAssetOptions,
              ...rampBatTokens,
              ...rampNonBatTokens
            ]
          const sortedSardineOptions =
            [
              ...sardineNativeAssetOptions,
              ...sardineBatTokens,
              ...sardineNonBatTokens
            ]
          const sortedTransakOptions =
            [
              ...transakNativeAssetOptions,
              ...transakBatTokens,
              ...transakNonBatTokens
            ]
          const sortedStripeOptions =
            [
              ...stripeNativeAssetOptions,
              ...stripeBatTokens,
              ...stripeNonBatTokens
            ]

          const results = {
            rampAssetOptions: sortedRampOptions,
            sardineAssetOptions: sortedSardineOptions,
            transakAssetOptions: sortedTransakOptions,
            stripeAssetOptions: sortedStripeOptions,
            allAssetOptions: getUniqueAssets([
              ...sortedRampOptions,
              ...sortedSardineOptions,
              ...sortedTransakOptions,
              ...sortedStripeOptions
            ])
          }

          return {
            data: results
          }
        } catch (error) {
          const errorMessage = `Unable to fetch onRamp assets: ${error}`
          console.log(errorMessage)
          return {
            error: errorMessage
          }
        }
      }, providesTags: (_results, error, _arg) => {
        if (error) {
          return ['UNKNOWN_ERROR']
        }
        return ['OnRampAssets']
      }
    })
  }
}
