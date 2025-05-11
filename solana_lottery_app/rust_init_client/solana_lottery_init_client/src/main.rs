use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};
use solana_client::rpc_client::RpcClient;
use std::str::FromStr;
// use bs58; // Unused import
use std::fs::File;
use std::io::Read;
// use serde_json::Value; // Unused import
use anyhow::Result;

fn main() -> Result<()> {
    // 1. Connect to Solana Devnet
    let rpc_url = String::from("https://api.devnet.solana.com");
    let client = RpcClient::new(rpc_url);
    println!("Connected to Devnet.");

    // 2. Load Admin Keypair (Payer)
    let admin_keypair_path = "/home/ubuntu/.config/solana/id.json";
    let mut file = File::open(admin_keypair_path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let secret_key_bytes: Vec<u8> = serde_json::from_str(&contents)?;
    let admin_keypair = Keypair::from_bytes(&secret_key_bytes).expect("Failed to load admin keypair from bytes");
    println!("Admin keypair loaded: {}", admin_keypair.pubkey());

    // 3. Define Program ID for the deployed solana_lottery_contract
    let program_id = Pubkey::from_str("58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv")?;
    println!("Lottery Program ID: {}", program_id);

    // 4. Define LotteryConfig PDA
    let (lottery_config_pda, _bump_seed) = Pubkey::find_program_address(
        &[b"lottery_config"],
        &program_id,
    );
    println!("Lottery Config PDA: {}", lottery_config_pda);

    // 5. Define Development Fee Receiver Public Key
    let dev_fee_receiver_pubkey = Pubkey::from_str("Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn")?;
    println!("Development Fee Receiver: {}", dev_fee_receiver_pubkey);

    // 6. Define Entry Fee Lamports (0.1 SOL = 100,000,000 lamports)
    let entry_fee_lamports: u64 = 100_000_000;
    println!("Entry Fee: {} lamports", entry_fee_lamports);

    // 7. Construct the initialize_config instruction data
    let instruction_discriminator: [u8; 8] = [216, 158, 111, 249, 105, 3, 69, 201]; 

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&instruction_discriminator);
    instruction_data.extend_from_slice(dev_fee_receiver_pubkey.as_ref());
    instruction_data.extend_from_slice(&entry_fee_lamports.to_le_bytes());

    // 8. Define accounts for the instruction
    let accounts = vec![
        AccountMeta::new(lottery_config_pda, false), // lottery_config account
        AccountMeta::new(admin_keypair.pubkey(), true), // admin account (signer)
        AccountMeta::new_readonly(system_program::id(), false), // system_program
    ];

    // 9. Create the instruction
    let instruction = Instruction {
        program_id,
        accounts,
        data: instruction_data,
    };

    // 10. Create and send a transaction
    let recent_blockhash = client.get_latest_blockhash()?;
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&admin_keypair.pubkey()),
        &[&admin_keypair],
        recent_blockhash,
    );

    println!("Sending transaction to initialize LotteryConfig...");
    match client.send_and_confirm_transaction_with_spinner(&transaction) {
        Ok(signature) => {
            println!(
                "Transaction successful with signature: {}. LotteryConfig should be initialized.",
                signature
            );
            println!("Verify on Solana Explorer: https://explorer.solana.com/tx/{}?cluster=devnet", signature);
        }
        Err(e) => {
            eprintln!("Transaction failed: {:?}", e);
            // Removed detailed error parsing that used solana_transaction_status
            return Err(e.into());
        }
    }

    Ok(())
}

