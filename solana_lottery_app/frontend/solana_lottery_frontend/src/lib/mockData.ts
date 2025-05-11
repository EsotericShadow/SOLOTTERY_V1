export const MOCK_LOTTERY_CONFIG = {
  adminKey: "AdminWalletAddressMock",
  devFeeReceiver: "DevFeeWalletAddressMock",
  entryFeeLamports: 100000000, // 0.1 SOL
  isPaused: false,
  currentLotteryRoundId: 2,
  bump: 255,
};

export const MOCK_CURRENT_LOTTERY_ROUND = {
  roundId: 2,
  startTime: Math.floor(Date.now() / 1000) - (3600 * 24 * 3), // 3 days ago
  endTime: Math.floor(Date.now() / 1000) + (3600 * 24 * 4), // 4 days from now
  ticketPrice: 100000000, // 0.1 SOL
  totalPot: 5500000000, // 5.5 SOL
  participants: [
    "ParticipantWallet1Mockkkkkkkkkkkkkkkkkkkkk",
    "ParticipantWallet2Mockkkkkkkkkkkkkkkkkkkkk",
    "ParticipantWallet3Mockkkkkkkkkkkkkkkkkkkkk",
    "ParticipantWallet4Mockkkkkkkkkkkkkkkkkkkkk",
    "ParticipantWallet5Mockkkkkkkkkkkkkkkkkkkkk",
  ],
  winner: null, // No winner yet for current round
  claimed: false,
  isDrawn: false,
};

export const MOCK_PAST_LOTTERY_ROUNDS = [
  {
    roundId: 1,
    startTime: Math.floor(Date.now() / 1000) - (3600 * 24 * 10), // 10 days ago
    endTime: Math.floor(Date.now() / 1000) - (3600 * 24 * 3), // 3 days ago (ended)
    ticketPrice: 100000000,
    totalPot: 12300000000, // 12.3 SOL
    participants: [
      "PastParticipantA", 
      "PastParticipantB", 
      "PastParticipantC",
      "PastParticipantD",
      "PastParticipantE",
      "PastParticipantF",
      "PastParticipantG",
      "PastParticipantH",
      "PastParticipantI",
      "PastParticipantJ",
      "PastParticipantK",
      "PastParticipantL",
    ],
    winner: "WinnerWalletAddressMock1",
    claimed: true,
    isDrawn: true,
    prizeDistribution: {
      mainWinner: "WinnerWalletAddressMock1",
      secondaryWinners: [
        "SecondaryWinnerA",
        "SecondaryWinnerB",
        "SecondaryWinnerC",
        "SecondaryWinnerD",
      ],
      developmentFee: "DevFeeWalletAddressMock",
    },
  },
];

export const MOCK_USER_TICKETS = [
  {
    roundId: 2,
    ticketId: "UserTicketMockID1_Round2",
    participantAddress: "UserWalletAddressMockActive", // Assuming this is the connected user
    purchaseTime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  },
  {
    roundId: 1,
    ticketId: "UserTicketMockID2_Round1",
    participantAddress: "UserWalletAddressMockActive",
    purchaseTime: Math.floor(Date.now() / 1000) - (3600 * 24 * 5), // 5 days ago
  },
];

