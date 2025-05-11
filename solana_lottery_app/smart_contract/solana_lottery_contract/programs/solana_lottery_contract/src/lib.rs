use anchor_lang::prelude::*;
use anchor_lang::system_program;

// Program ID - This should be updated with the actual Program ID after the first successful build and deployment.
// The current ID "58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv" is a placeholder or an ID from a previous deployment.
declare_id!("58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv");

/// # Solana Lottery Contract
///
/// This program implements a decentralized weekly lottery system on the Solana blockchain.
/// It allows an administrator to configure the lottery, start new rounds, and manage prize distribution.
/// Participants can enter the lottery by paying an entry fee, and winners are selected through a pseudo-random draw mechanism.
#[program]
pub mod solana_lottery_contract {
    use super::*; // Imports items from the parent module (e.g., structs defined outside this mod).

    /// ## Initialize Configuration
    ///
    /// Initializes the main configuration account (`LotteryConfig`) for the lottery program.
    /// This function can only be called once by the designated admin to set up the initial parameters.
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The `LotteryConfig` account to be initialized (PDA: seeds = ["lottery_config"]).
    ///     * `admin`: The signer account that will become the administrator of the lottery.
    ///     * `system_program`: Required by Anchor for account initialization.
    /// * `dev_fee_receiver` - The public key of the account that will receive development fees.
    /// * `entry_fee_lamports` - The cost in lamports for one lottery ticket.
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if the initialization is successful.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        dev_fee_receiver: Pubkey,      // The public key for the development fee receiver account.
        entry_fee_lamports: u64,       // The entry fee for the lottery in lamports (e.g., 0.1 SOL = 100,000,000 lamports).
    ) -> Result<()> {
        msg!("Instruction: Initialize Lottery Config");
        let lottery_config = &mut ctx.accounts.lottery_config; // Get a mutable reference to the lottery_config account.

        // Set the initial values for the LotteryConfig account.
        lottery_config.admin_key = *ctx.accounts.admin.key; // The admin who initialized the config.
        lottery_config.dev_fee_receiver = dev_fee_receiver;  // Wallet to receive a percentage of the pot.
        lottery_config.entry_fee_lamports = entry_fee_lamports; // Cost per ticket.
        lottery_config.is_paused = false;                    // Lottery is active by default.
        lottery_config.current_lottery_round_id = 0;         // No rounds have occurred yet.
        lottery_config.bump = ctx.bumps.lottery_config;      // Store the bump seed for the PDA.

        msg!("Lottery Config Initialized. Admin: {}, Dev Fee Receiver: {}, Entry Fee: {}", 
             lottery_config.admin_key, lottery_config.dev_fee_receiver, lottery_config.entry_fee_lamports);
        Ok(())
    }

    /// ## Update Configuration
    ///
    /// Allows the administrator to update certain parameters of the `LotteryConfig` account.
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The `LotteryConfig` account to be updated.
    ///     * `admin`: The signer account, must match `lottery_config.admin_key`.
    /// * `new_dev_fee_receiver` - (Optional) New public key for the development fee receiver.
    /// * `new_entry_fee_lamports` - (Optional) New entry fee in lamports.
    /// * `new_is_paused` - (Optional) New pause status for the lottery.
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if the update is successful.
    /// * `Err(LotteryError::UnauthorizedAdmin)` if the signer is not the admin.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_dev_fee_receiver: Option<Pubkey>,
        new_entry_fee_lamports: Option<u64>,
        new_is_paused: Option<bool>,
    ) -> Result<()> {
        msg!("Instruction: Update Lottery Config");
        let lottery_config = &mut ctx.accounts.lottery_config;

        // Ensure the signer is the admin.
        require!(lottery_config.admin_key == *ctx.accounts.admin.key, LotteryError::UnauthorizedAdmin);

        // Update fields if new values are provided.
        if let Some(receiver) = new_dev_fee_receiver {
            lottery_config.dev_fee_receiver = receiver;
            msg!("Updated dev_fee_receiver to: {}", receiver);
        }
        if let Some(fee) = new_entry_fee_lamports {
            lottery_config.entry_fee_lamports = fee;
            msg!("Updated entry_fee_lamports to: {}", fee);
        }
        if let Some(paused_status) = new_is_paused {
            lottery_config.is_paused = paused_status;
            msg!("Updated is_paused to: {}", paused_status);
        }
        msg!("Lottery Config Updated Successfully");
        Ok(())
    }

    /// ## Start New Lottery Round
    ///
    /// Allows the administrator to start a new lottery round.
    /// Initializes a new `LotteryRound` account and increments the `current_lottery_round_id` in `LotteryConfig`.
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The main `LotteryConfig` account (mutable to update `current_lottery_round_id`).
    ///     * `lottery_round`: The new `LotteryRound` account to be initialized (PDA: seeds = ["lottery_round", next_round_id_arg]).
    ///     * `admin`: The signer account, must match `lottery_config.admin_key`.
    ///     * `system_program`: Required by Anchor for account initialization.
    /// * `draw_timestamp_offset_seconds` - The duration of the lottery round in seconds from the current time.
    /// * `next_round_id_arg` - The ID for the new round, used as a seed for the `LotteryRound` PDA. Must be `current_lottery_round_id + 1`.
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if the new round is started successfully.
    /// * `Err` for various conditions like unauthorized admin, lottery paused, numeric overflow, or incorrect round ID argument.
    pub fn start_new_lottery_round(
        ctx: Context<StartNewLotteryRound>,
        draw_timestamp_offset_seconds: i64, // Duration of the round in seconds.
        next_round_id_arg: u64,             // Expected ID for the new round, used in PDA derivation.
    ) -> Result<()> {
        msg!("Instruction: Start New Lottery Round. Argument next_round_id_arg: {}", next_round_id_arg);
        let lottery_config = &mut ctx.accounts.lottery_config;
        let lottery_round = &mut ctx.accounts.lottery_round;
        let clock = Clock::get()?; // Get the current Solana clock time.

        // Admin and lottery status checks.
        require!(lottery_config.admin_key == *ctx.accounts.admin.key, LotteryError::UnauthorizedAdmin);
        require!(!lottery_config.is_paused, LotteryError::LotteryPaused);

        // Calculate the expected next round ID.
        let expected_next_round_id = lottery_config.current_lottery_round_id.checked_add(1).ok_or(LotteryError::NumericOverflow)?;
        // Ensure the provided argument matches the expected next round ID for PDA consistency.
        require!(next_round_id_arg == expected_next_round_id, LotteryError::IncorrectNextRoundIdArg);

        // Update the current round ID in the global config.
        lottery_config.current_lottery_round_id = expected_next_round_id;
        
        // Initialize the new LotteryRound account.
        lottery_round.round_id = expected_next_round_id;
        lottery_round.start_timestamp = clock.unix_timestamp;
        lottery_round.draw_timestamp = clock.unix_timestamp.checked_add(draw_timestamp_offset_seconds).ok_or(LotteryError::NumericOverflow)?;
        lottery_round.total_pot_lamports = 0;
        lottery_round.participants = Vec::new(); // Initialize with an empty list of participants.
        lottery_round.is_active = true;           // Mark the round as active.
        lottery_round.winners_drawn = false;
        lottery_round.prizes_distributed = false;
        lottery_round.main_winner = None;
        lottery_round.other_winners = Vec::new();
        lottery_round.randomness_seed = None;
        lottery_round.bump = ctx.bumps.lottery_round; // Store the bump seed for the PDA.

        msg!("Lottery Round {} started. Draw scheduled for timestamp: {}. Admin: {}", 
             expected_next_round_id, lottery_round.draw_timestamp, ctx.accounts.admin.key);
        Ok(())
    }

    /// ## Enter Lottery
    ///
    /// Allows a participant to enter the current active lottery round by paying the entry fee.
    /// The entry fee is transferred from the participant's account to the `LotteryRound` account.
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The main `LotteryConfig` account (to check fee and pause status).
    ///     * `lottery_round`: The current `LotteryRound` account (mutable to add participant and update pot).
    ///     * `participant`: The signer account entering the lottery.
    ///     * `system_program`: Required for the SOL transfer (CPI).
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if the participant successfully enters the lottery.
    /// * `Err` for various conditions like lottery paused, round inactive, draw time passed, already entered, or incorrect round.
    pub fn enter_lottery(ctx: Context<EnterLottery>) -> Result<()> {
        msg!("Instruction: Enter Lottery");
        let lottery_config = &ctx.accounts.lottery_config;
        let lottery_round = &mut ctx.accounts.lottery_round;
        let participant_signer = &ctx.accounts.participant;
        let clock = Clock::get()?;

        // Pre-condition checks.
        require!(!lottery_config.is_paused, LotteryError::LotteryPaused);
        require!(lottery_round.is_active, LotteryError::LotteryRoundNotActive);
        require!(clock.unix_timestamp < lottery_round.draw_timestamp, LotteryError::LotteryDrawTimePassed);
        require!(!lottery_round.participants.contains(participant_signer.key), LotteryError::ParticipantAlreadyEntered);
        // Ensure this is the correct, currently active lottery round PDA being interacted with.
        require!(lottery_round.round_id == lottery_config.current_lottery_round_id, LotteryError::IncorrectLotteryRound);

        // CPI: Transfer entry fee from participant to the lottery round account.
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: participant_signer.to_account_info(),
                to: lottery_round.to_account_info(), // Transfer to the LotteryRound PDA itself.
            },
        );
        system_program::transfer(cpi_context, lottery_config.entry_fee_lamports)?;

        // Add participant to the list and update the total pot.
        lottery_round.participants.push(*participant_signer.key);
        lottery_round.total_pot_lamports = lottery_round.total_pot_lamports.checked_add(lottery_config.entry_fee_lamports).ok_or(LotteryError::NumericOverflow)?;

        msg!("Participant {} entered round {}. Current pot: {} lamports.", 
             participant_signer.key(), lottery_round.round_id, lottery_round.total_pot_lamports);
        Ok(())
    }


    /// ## Conduct Draw
    ///
    /// Conducts the draw for the current active lottery round. This function should be called after the `draw_timestamp` has passed.
    /// It uses a pseudo-random seed generated from slot hashes and other data to select winners.
    /// Five winners are selected: one main winner and four other winners.
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The main `LotteryConfig` account (to check pause status and current round ID).
    ///     * `lottery_round`: The current `LotteryRound` account (mutable to update winner information, randomness seed, and status).
    ///     * `slot_hashes`: The SlotHashes sysvar, used as a source of on-chain randomness.
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if the draw is conducted successfully and winners are selected.
    /// * `Err` for various conditions like lottery paused, round still active, winners already drawn, draw time not reached, not enough participants, or issues during winner selection.
    pub fn conduct_draw(ctx: Context<ConductDraw>) -> Result<()> {
        msg!("Instruction: Conduct Draw for Round {}", ctx.accounts.lottery_round.round_id);
        let lottery_config = &ctx.accounts.lottery_config; // Read-only access to config.
        let lottery_round = &mut ctx.accounts.lottery_round; // Mutable access to update round details.
        let clock = Clock::get()?;
        let slot_hashes = &ctx.accounts.slot_hashes; // Access to SlotHashes sysvar for randomness.

        // Pre-condition checks for conducting the draw.
        require!(!lottery_config.is_paused, LotteryError::LotteryPaused);
        // require!(lottery_round.is_active, LotteryError::LotteryRoundStillActive); // This check might be too strict if draw_timestamp has passed. The below check is better.
        require!(!lottery_round.winners_drawn, LotteryError::WinnersAlreadyDrawn);
        require!(clock.unix_timestamp >= lottery_round.draw_timestamp, LotteryError::DrawTimeNotReached);
        require!(lottery_round.participants.len() >= 5, LotteryError::NotEnoughParticipants); // Must have at least 5 participants to select 5 winners.
        require!(lottery_round.round_id == lottery_config.current_lottery_round_id, LotteryError::IncorrectLotteryRound);

        // Generate randomness seed from slot hash and other data.
        // Note: This is a pseudo-random method and may have limitations for high-value lotteries. Consider oracles for stronger randomness if needed.
        let slot_hash_data = slot_hashes.data.borrow();
        // According to Solana docs, the first 12 bytes are metadata (e.g., number of hashes), then hashes follow.
        // We take a slice of the slot hash data as part of the seed.
        let most_recent_slot_hash = &slot_hash_data[12..44]; // Using a 32-byte slice from slot hashes.
        let mut seed_material = Vec::new();
        seed_material.extend_from_slice(most_recent_slot_hash);
        seed_material.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
        seed_material.extend_from_slice(&(lottery_round.participants.len() as u64).to_le_bytes());
        let randomness_seed = anchor_lang::solana_program::keccak::hash(&seed_material).to_bytes();
        lottery_round.randomness_seed = Some(randomness_seed);

        // Select 5 unique winners.
        let num_participants = lottery_round.participants.len();
        let mut winners_pubkeys: Vec<Pubkey> = Vec::new();
        let mut selected_indices: Vec<usize> = Vec::new(); // To ensure unique winners.

        // Loop to select 5 winners.
        for i_val in 0..5u64 { // Iterate 5 times for 5 winners.
            let mut attempts: u64 = 0; // Counter for attempts to find a unique winner for this slot.
            loop {
                // Create a unique seed for each winner selection attempt by incorporating the loop index and attempt count.
                let mut index_seed_material = Vec::new();
                index_seed_material.extend_from_slice(&randomness_seed);
                index_seed_material.extend_from_slice(&i_val.to_le_bytes()); // Differentiate seed for each of the 5 winners.
                index_seed_material.extend_from_slice(&attempts.to_le_bytes()); // Differentiate seed for each attempt if a collision occurs.
                
                let index_hash = anchor_lang::solana_program::keccak::hash(&index_seed_material).to_bytes();
                // Convert the first 8 bytes of the hash to a u64.
                let index_u64 = u64::from_le_bytes(index_hash[0..8].try_into().unwrap());
                let winner_index = (index_u64 % num_participants as u64) as usize; // Modulo to get an index within the participants list.

                if !selected_indices.contains(&winner_index) {
                    selected_indices.push(winner_index);
                    winners_pubkeys.push(lottery_round.participants[winner_index]);
                    break; // Found a unique winner for this slot.
                }
                attempts += 1;
                // Safety break to prevent infinite loops in unlikely scenarios (e.g., extreme hash collisions or logic error).
                if attempts > (num_participants * 2) as u64 { 
                    msg!("Error: Could not select unique winner after {} attempts for winner slot {}.", attempts, i_val);
                    return err!(LotteryError::WinnerSelectionFailed); 
                }
            }
        }

        // Assign winners.
        lottery_round.main_winner = Some(winners_pubkeys[0]);
        lottery_round.other_winners = winners_pubkeys[1..5].to_vec(); // The next 4 are other winners.
        lottery_round.winners_drawn = true;
        lottery_round.is_active = false; // Mark the round as inactive after the draw.

        msg!("Draw Conducted for Round {}. Main Winner: {}. Other Winners: {:?}", 
             lottery_round.round_id, lottery_round.main_winner.unwrap(), lottery_round.other_winners);
        Ok(())
    }

    /// ## Distribute Prizes
    ///
    /// Distributes the prize pool to the winners and the development fee receiver.
    /// This function should be called after `conduct_draw` has successfully run and winners are set.
    /// The prize distribution is as follows:
    /// - 10% to Dev Fee Receiver
    /// - 50% to Main Winner
    /// - 10% to each of the 4 Other Winners (total 40%)
    ///
    /// ### Arguments
    ///
    /// * `ctx` - The context containing accounts for this instruction.
    ///     * `lottery_config`: The main `LotteryConfig` account.
    ///     * `lottery_round`: The `LotteryRound` account from which prizes are distributed (mutable for lamport transfers and status update).
    ///     * `dev_fee_receiver`: The account to receive development fees (must match `lottery_config.dev_fee_receiver`).
    ///     * `remaining_accounts`: A list of 5 `AccountInfo`s for the winners, in the order: Main Winner, Other Winner 1, Other Winner 2, Other Winner 3, Other Winner 4.
    ///                          These accounts must be mutable and match the pubkeys stored in `lottery_round`.
    ///
    /// ### Returns
    ///
    /// * `Ok(())` if prizes are distributed successfully.
    /// * `Err` for various conditions like lottery paused, incorrect round, winners not drawn, prizes already distributed, incorrect winner accounts, or numeric overflow.
    pub fn distribute_prizes(ctx: Context<DistributePrizes>) -> Result<()> {
        msg!("Instruction: Distribute Prizes for Round {}", ctx.accounts.lottery_round.round_id);
        let lottery_config = &ctx.accounts.lottery_config;
        let lottery_round_account_info = ctx.accounts.lottery_round.to_account_info(); // For direct lamport manipulation.
    
        // --- Read-only section for lottery_round data to avoid borrowing conflicts ---
        let main_winner_pubkey: Pubkey;
        let other_winners_len: usize;
        let other_winners_snapshot: Vec<Pubkey>; // Snapshot to avoid borrow issues during iteration and checks.
        let total_pot: u64;
        {
            let lottery_round_data = &ctx.accounts.lottery_round; // Immutable borrow for reading initial state.
            main_winner_pubkey = lottery_round_data.main_winner.ok_or(LotteryError::WinnerNotSet)?;
            other_winners_len = lottery_round_data.other_winners.len();
            other_winners_snapshot = lottery_round_data.other_winners.clone(); // Clone to use outside this borrow scope.
            total_pot = lottery_round_data.total_pot_lamports;

            // Pre-condition checks based on read-only data.
            require!(other_winners_len == 4, LotteryError::IncorrectNumberOfWinnersSet); // Ensure 4 other winners are set.
            require!(total_pot > 0, LotteryError::ZeroPotAmount); // Ensure there's something to distribute.
        }
        // --- End of read-only section ---

        // Validate the number of winner accounts passed in `remaining_accounts`.
        // Expecting 1 main winner + 4 other winners = 5 accounts.
        require!(ctx.remaining_accounts.len() == 1 + 4, LotteryError::IncorrectNumberOfWinnerAccounts);

        // Validate the main winner account.
        let main_winner_account_info = &ctx.remaining_accounts[0];
        require!(main_winner_account_info.key() == main_winner_pubkey, LotteryError::IncorrectMainWinnerAccount);

        // Validate the other winner accounts.
        for i in 0..4 {
            let expected_pubkey = other_winners_snapshot[i];
            let actual_account_info = &ctx.remaining_accounts[i + 1];
            require!(actual_account_info.key() == expected_pubkey, LotteryError::IncorrectOtherWinnerAccount);
        }
        
        // Calculate prize shares.
        // Dev fee: 10%
        let dev_share = total_pot.checked_mul(10).ok_or(LotteryError::NumericOverflow)?.checked_div(100).ok_or(LotteryError::NumericOverflow)?;
        // Main winner: 50%
        let main_winner_share = total_pot.checked_mul(50).ok_or(LotteryError::NumericOverflow)?.checked_div(100).ok_or(LotteryError::NumericOverflow)?;
        // Each other winner: 10% (total 40% for 4 winners)
        let other_winner_share = total_pot.checked_mul(10).ok_or(LotteryError::NumericOverflow)?.checked_div(100).ok_or(LotteryError::NumericOverflow)?;
        
        // Verify that the sum of shares does not exceed the total pot (due to potential rounding).
        let mut total_to_distribute = dev_share.checked_add(main_winner_share).ok_or(LotteryError::NumericOverflow)?;
        total_to_distribute = total_to_distribute.checked_add(other_winner_share.checked_mul(4).ok_or(LotteryError::NumericOverflow)?).ok_or(LotteryError::NumericOverflow)?;
        require!(total_to_distribute <= total_pot, LotteryError::DistributionExceedsPot);

        // --- Perform lamport transfers --- 
        // Note: Direct lamport transfers require the accounts to be owned by the system program or the current program.
        // The LotteryRound PDA holds the funds and is owned by this program.
        // Winner accounts are external and must be mutable.

        // Transfer to dev fee receiver.
        **lottery_round_account_info.try_borrow_mut_lamports()? -= dev_share;
        **ctx.accounts.dev_fee_receiver.to_account_info().try_borrow_mut_lamports()? += dev_share;
        msg!("Transferred {} lamports to dev fee receiver {}", dev_share, ctx.accounts.dev_fee_receiver.key());

        // Transfer to main winner.
        **lottery_round_account_info.try_borrow_mut_lamports()? -= main_winner_share;
        **main_winner_account_info.try_borrow_mut_lamports()? += main_winner_share;
        msg!("Transferred {} lamports to main winner {}", main_winner_share, main_winner_account_info.key());

        // Transfer to other winners.
        for i in 0..4 {
            let other_winner_account_info = &ctx.remaining_accounts[i + 1];
            **lottery_round_account_info.try_borrow_mut_lamports()? -= other_winner_share;
            **other_winner_account_info.try_borrow_mut_lamports()? += other_winner_share;
            msg!("Transferred {} lamports to other winner {}", other_winner_share, other_winner_account_info.key());
        }
        // --- End of lamport transfers ---
        
        // Mark prizes as distributed in the LotteryRound account.
        let lottery_round_data_mut = &mut ctx.accounts.lottery_round; // Mutable borrow for writing the final flag.
        lottery_round_data_mut.prizes_distributed = true;
        msg!("Prizes Distributed Successfully for Round {}", lottery_round_data_mut.round_id);
        Ok(())
    }
}

/// ## InitializeConfig Accounts
/// Defines the accounts required for the `initialize_config` instruction.
#[derive(Accounts)]
pub struct InitializeConfig<'info> { // Added 'info lifetime explicitly for clarity, though often inferred.
    /// The `LotteryConfig` account to be created and initialized.
    /// It's a Program Derived Address (PDA) seeded with "lottery_config".
    /// `init` constraint means this account will be created by this instruction.
    /// `payer = admin` means the `admin` account will pay for its creation.
    /// `space` defines the initial disk space allocation for the account.
    /// `seeds` and `bump` are used for PDA derivation and validation.
    #[account(init, payer = admin, space = 8 + LotteryConfig::INIT_SPACE, seeds = [b"lottery_config"], bump)]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The signer account that will become the administrator of the lottery.
    /// `mut` indicates this account's lamports may be debited (for account creation rent).
    #[account(mut)]
    pub admin: Signer<'info>,
    /// The Solana System Program, required by Anchor for account creation and other system-level operations.
    pub system_program: Program<'info, System>,
}

/// ## UpdateConfig Accounts
/// Defines the accounts required for the `update_config` instruction.
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    /// The `LotteryConfig` account to be updated.
    /// `mut` indicates its data will be modified.
    /// `seeds` and `bump` ensure we are operating on the correct PDA, using the bump stored in `lottery_config` itself.
    #[account(mut, seeds = [b"lottery_config"], bump = lottery_config.bump)]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The signer account, must match the `admin_key` stored in `lottery_config`.
    pub admin: Signer<'info>,
}

/// ## StartNewLotteryRound Accounts
/// Defines the accounts required for the `start_new_lottery_round` instruction.
#[derive(Accounts)]
#[instruction(draw_timestamp_offset_seconds: i64, next_round_id_arg: u64)] // Instruction arguments used in account constraints/seeds.
pub struct StartNewLotteryRound<'info> {
    /// The main `LotteryConfig` account.
    /// `mut` because `current_lottery_round_id` is updated.
    #[account(mut, seeds = [b"lottery_config"], bump = lottery_config.bump)]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The new `LotteryRound` account to be initialized.
    /// It's a PDA seeded with "lottery_round" and the `next_round_id_arg`.
    /// `init` constraint means this account will be created.
    /// `payer = admin` means the `admin` account pays for its creation.
    #[account(
        init, 
        payer = admin, 
        space = 8 + LotteryRound::INIT_SPACE, 
        seeds = [b"lottery_round".as_ref(), &next_round_id_arg.to_le_bytes().as_ref()], // Use next_round_id_arg from instruction args for PDA seed.
        bump
    )]
    pub lottery_round: Account<'info, LotteryRound>,
    /// The signer account, must be the admin.
    /// `mut` because it pays for the new `LotteryRound` account.
    #[account(mut)]
    pub admin: Signer<'info>,
    /// The Solana System Program.
    pub system_program: Program<'info, System>,
}

/// ## EnterLottery Accounts
/// Defines the accounts required for the `enter_lottery` instruction.
#[derive(Accounts)]
pub struct EnterLottery<'info> {
    /// The main `LotteryConfig` account (read-only access for fee, pause status).
    #[account(seeds = [b"lottery_config"], bump = lottery_config.bump)]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The current `LotteryRound` account.
    /// `mut` because its `participants` list and `total_pot_lamports` are updated, and it receives the entry fee.
    /// Seeds use `lottery_config.current_lottery_round_id` to ensure interaction with the correct active round PDA.
    #[account(
        mut, 
        seeds = [b"lottery_round".as_ref(), &lottery_config.current_lottery_round_id.to_le_bytes().as_ref()], 
        bump = lottery_round.bump
    )]
    pub lottery_round: Account<'info, LotteryRound>,
    /// The signer account entering the lottery.
    /// `mut` because it pays the entry fee.
    #[account(mut)]
    pub participant: Signer<'info>,
    /// The Solana System Program, required for the CPI SOL transfer.
    pub system_program: Program<'info, System>,
}

/// ## ConductDraw Accounts
/// Defines the accounts required for the `conduct_draw` instruction.
#[derive(Accounts)]
pub struct ConductDraw<'info> {
    /// The main `LotteryConfig` account (read-only for checks).
    #[account(seeds = [b"lottery_config"], bump = lottery_config.bump)]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The current `LotteryRound` account.
    /// `mut` because winner information, randomness seed, and status flags are updated.
    #[account(
        mut, 
        seeds = [b"lottery_round".as_ref(), &lottery_config.current_lottery_round_id.to_le_bytes().as_ref()], 
        bump = lottery_round.bump
    )]
    pub lottery_round: Account<'info, LotteryRound>,
    /// The SlotHashes sysvar account, used for pseudo-randomness.
    /// `/// CHECK:` is used because this is a sysvar and doesn't require typical ownership/PDA checks, but its address is validated.
    #[account(address = anchor_lang::solana_program::sysvar::slot_hashes::ID)]
    pub slot_hashes: UncheckedAccount<'info>,
}

/// ## DistributePrizes Accounts
/// Defines the accounts required for the `distribute_prizes` instruction.
#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    /// The main `LotteryConfig` account.
    /// Constraints ensure the lottery is not paused.
    #[account(
        seeds = [b"lottery_config"], 
        bump = lottery_config.bump, 
        constraint = !lottery_config.is_paused @ LotteryError::LotteryPaused
    )]
    pub lottery_config: Account<'info, LotteryConfig>,
    /// The `LotteryRound` account from which prizes are distributed.
    /// `mut` because its lamports are transferred out, and `prizes_distributed` flag is set.
    /// Constraints ensure it's the correct round, winners have been drawn, and prizes haven't been distributed yet.
    #[account(
        mut, 
        seeds = [b"lottery_round".as_ref(), &lottery_config.current_lottery_round_id.to_le_bytes().as_ref()], 
        bump = lottery_round.bump,
        constraint = lottery_round.round_id == lottery_config.current_lottery_round_id @ LotteryError::IncorrectLotteryRound,
        constraint = lottery_round.winners_drawn @ LotteryError::WinnersNotYetDrawn,
        constraint = !lottery_round.prizes_distributed @ LotteryError::PrizesAlreadyDistributed
    )]
    pub lottery_round: Account<'info, LotteryRound>,
    /// The development fee receiver account.
    /// `mut` because it receives lamports.
    /// `/// CHECK:` The address is validated against `lottery_config.dev_fee_receiver`.
    #[account(mut, address = lottery_config.dev_fee_receiver @ LotteryError::IncorrectDevFeeReceiver)]
    pub dev_fee_receiver: AccountInfo<'info>,
    // Remaining accounts (for winners) are passed dynamically via `ctx.remaining_accounts`.
    // Their mutability and correctness are checked within the instruction logic.
    // It's crucial that the client provides these accounts in the correct order and ensures they are mutable.
}


/// ## LotteryConfig Account
/// Stores the global configuration for the lottery program.
/// This is a PDA seeded with `b"lottery_config"`.
#[account]
#[derive(InitSpace)] // Automatically calculates space needed for the account based on its fields.
pub struct LotteryConfig {
    /// The public key of the administrator who can manage the lottery.
    pub admin_key: Pubkey,
    /// The public key of the account that receives development fees.
    pub dev_fee_receiver: Pubkey,
    /// The entry fee for each lottery ticket, in lamports.
    pub entry_fee_lamports: u64,
    /// A flag to pause or resume the lottery operations (e.g., new entries, starting new rounds).
    pub is_paused: bool,
    /// The ID of the current or most recently concluded lottery round.
    pub current_lottery_round_id: u64,
    /// The bump seed used for PDA derivation of this account.
    pub bump: u8,
}

/// ## LotteryRound Account
/// Stores the state for a specific lottery round.
/// This is a PDA seeded with `b"lottery_round"` and the `round_id`.
#[account]
#[derive(InitSpace)]
pub struct LotteryRound {
    /// The unique identifier for this lottery round.
    pub round_id: u64,
    /// Unix timestamp when the round started and entries became open.
    pub start_timestamp: i64,
    /// Unix timestamp when the draw will occur and entries will close.
    pub draw_timestamp: i64,
    /// The total amount of lamports collected from ticket sales for this round.
    pub total_pot_lamports: u64,
    /// A vector storing the public keys of all participants who entered this round.
    #[max_len(2000)] // Example: Max 2000 participants. Adjust based on expected scale and transaction size limits.
    pub participants: Vec<Pubkey>,
    /// Flag indicating if the lottery round is currently active (i.e., accepting entries).
    pub is_active: bool,
    /// Flag indicating if the winners for this round have been drawn.
    pub winners_drawn: bool,
    /// Flag indicating if the prizes for this round have been distributed.
    pub prizes_distributed: bool,
    /// The public key of the main winner of this round (receives 50% of the pot).
    pub main_winner: Option<Pubkey>,
    /// A vector storing the public keys of the other winners (e.g., 4 winners receiving 10% each).
    #[max_len(4)] // Fixed at 4 other winners for this implementation.
    pub other_winners: Vec<Pubkey>,
    /// The pseudo-random seed generated and used for the draw in this round.
    pub randomness_seed: Option<[u8; 32]>,
    /// The bump seed used for PDA derivation of this account.
    pub bump: u8,
}

/// ## LotteryError Enum
/// Defines custom error codes for the lottery program.
#[error_code]
pub enum LotteryError {
    #[msg("Unauthorized: Signer is not the admin.")]
    UnauthorizedAdmin,
    #[msg("Lottery is currently paused.")]
    LotteryPaused,
    #[msg("Lottery round is not active.")]
    LotteryRoundNotActive,
    #[msg("Lottery round is still active. Draw cannot be conducted yet.")]
    LotteryRoundStillActive,
    #[msg("Lottery draw time has already passed. Cannot enter.")]
    LotteryDrawTimePassed,
    #[msg("Lottery draw time has not been reached yet.")]
    DrawTimeNotReached,
    #[msg("Participant has already entered this lottery round.")]
    ParticipantAlreadyEntered,
    #[msg("Winners have already been drawn for this round.")]
    WinnersAlreadyDrawn,
    #[msg("Prizes have already been distributed for this round.")]
    PrizesAlreadyDistributed,
    #[msg("Not enough participants to conduct a draw. Minimum 5 required.")]
    NotEnoughParticipants,
    #[msg("Winner not set. Cannot distribute prizes.")]
    WinnerNotSet,
    #[msg("Incorrect number of winners set in LotteryRound account.")]
    IncorrectNumberOfWinnersSet,
    #[msg("Incorrect number of winner accounts provided for prize distribution.")]
    IncorrectNumberOfWinnerAccounts,
    #[msg("Provided main winner account does not match the stored main winner.")]
    IncorrectMainWinnerAccount,
    #[msg("Provided other winner account does not match the stored other winner.")]
    IncorrectOtherWinnerAccount,
    #[msg("Incorrect development fee receiver account provided.")]
    IncorrectDevFeeReceiver,
    #[msg("Numeric overflow occurred during calculation.")]
    NumericOverflow,
    #[msg("The provided next_round_id_arg for PDA derivation is incorrect.")]
    IncorrectNextRoundIdArg,
    #[msg("Interaction with an incorrect or outdated LotteryRound PDA.")]
    IncorrectLotteryRound,
    #[msg("Failed to select unique winners after multiple attempts.")]
    WinnerSelectionFailed,
    #[msg("Total prize distribution amount exceeds the total pot.")]
    DistributionExceedsPot,
    #[msg("The total pot amount is zero, cannot distribute prizes.")]
    ZeroPotAmount,
    #[msg("Winners have not yet been drawn for this round.")]
    WinnersNotYetDrawn,
}

