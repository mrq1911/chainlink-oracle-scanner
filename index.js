#!/usr/bin/env node

const { ethers } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const CHAINLINK_AGGREGATOR_ABI = [
    "function decimals() external view returns (uint8)",
    "function description() external view returns (string memory)",
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function version() external view returns (uint256)",
    "function latestAnswer() external view returns (int256)",
];

async function isChainlinkPriceFeed(provider, contractAddress) {
    try {
        const contract = new ethers.Contract(contractAddress, CHAINLINK_AGGREGATOR_ABI, provider);
        await Promise.all([
            contract.decimals(),
            contract.description(),
            contract.latestRoundData()
        ]);
        return true;
    } catch (error) {
        return false;
    }
}

async function getPriceFeedInfo(provider, contractAddress) {
    const contract = new ethers.Contract(contractAddress, CHAINLINK_AGGREGATOR_ABI, provider);

    try {
        const [decimals, description, latestData, latestAnswer] = await Promise.all([
            contract.decimals().catch(() => undefined),
            contract.description().catch(() => undefined),
            contract.latestRoundData().catch(() => undefined),
            contract.latestAnswer().catch(() => undefined),
        ]);

        const price = parseFloat(latestAnswer.toString()) / Math.pow(10, decimals || 8);
        const updatedAt = latestData ? new Date(latestData.updatedAt.toNumber() * 1000) : undefined;

        return {
            address: contractAddress,
            pair: description,
            price: price,
            latestAnswer: latestAnswer.toString(),
            lastUpdate: updatedAt?.toISOString(),
            roundId: latestData?.roundId.toString(),
            decimals: decimals?.toString(),
            answer: latestData?.answer.toString()
        };
    } catch (error) {
        console.error(`Error fetching data for ${contractAddress}:`, error.message);
	      console.error(error);
        return null;
    }
}

async function main() {
    const argv = yargs(hideBin(process.argv))
        .option('provider', {
            alias: 'p',
            type: 'string',
            description: 'Ethereum provider URL',
            demandOption: true
        })
        .option('contract', {
            alias: 'c',
            type: 'string',
            description: 'contract addresses to check',
            demandOption: true
        })
        .help()
        .argv;

    const provider = new ethers.providers.JsonRpcProvider(argv.provider);

    console.log('Scanning contracts for Chainlink price feeds...\n');

	const address = argv.contract;

        try {
            const isOracle = await isChainlinkPriceFeed(provider, address);

            if (true) {
                const info = await getPriceFeedInfo(provider, address);
                if (info) {
                    console.log('Found Chainlink Price Feed:');
                    console.log('Address:', info.address);
                    console.log('Pair:', info.pair);
                    console.log('Current Price:', info.price);
                    console.log('Last Update:', info.lastUpdate);
                    console.log('Round ID:', info.roundId);
                    console.log('Latest Answer:', info.latestAnswer);
                    console.log('Decimals:', info.decimals);
                    console.log('-------------------\n');
                }
            } else {
                console.log(`${address} is not a Chainlink price feed\n`);
            }
        } catch (error) {
            console.error(`Error processing ${address}:`, error.message);
        }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
