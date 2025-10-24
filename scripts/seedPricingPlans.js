const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PricingPlan = require('../models/PricingPlan');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Pricing plans data - Only Monthly and Yearly Subscriptions
const pricingPlans = [
  // Monthly Subscription Plans
  {
    name: 'basic_monthly',
    displayName: 'Basic Plan',
    description: 'Perfect for casual users',
    planType: 'monthly',
    credits: 50,
    price: 99,
    currency: 'INR',
    features: [
      '50 credits per month',
      'Rollover up to 25 unused credits',
      'All image styles available',
      'Priority generation queue'
    ],
    rolloverCredits: 25,
    priority: 1,
    metadata: {
      popular: false,
      recommended: false,
      maxCreditsPerDay: null
    }
  },
  {
    name: 'pro_monthly',
    displayName: 'Pro Plan',
    description: 'Best for regular content creators',
    planType: 'monthly',
    credits: 200,
    price: 299,
    currency: 'INR',
    features: [
      '200 credits per month',
      'Rollover up to 100 unused credits',
      'All image styles available',
      'Priority support',
      'Advanced AI models access'
    ],
    rolloverCredits: 100,
    priority: 2,
    metadata: {
      popular: true,
      recommended: true,
      maxCreditsPerDay: null
    }
  },
  {
    name: 'business_monthly',
    displayName: 'Business Plan',
    description: 'For businesses and agencies',
    planType: 'monthly',
    credits: 1000,
    price: 799,
    currency: 'INR',
    features: [
      '1000 credits per month',
      'Rollover up to 500 unused credits',
      'All image styles available',
      'API access',
      'Custom branding options',
      'Dedicated support'
    ],
    rolloverCredits: 500,
    priority: 3,
    metadata: {
      popular: false,
      recommended: false,
      maxCreditsPerDay: null
    }
  },

  // Yearly Subscription Plans
  {
    name: 'pro_yearly',
    displayName: 'Pro Plan (Yearly)',
    description: 'Pro plan with 2 months free',
    planType: 'yearly',
    credits: 2400, // 200 * 12 months
    price: 2990, // 10 months price
    currency: 'INR',
    features: [
      '200 credits per month (2400 total)',
      'Rollover up to 100 unused credits',
      'All image styles available',
      'Priority support',
      'Advanced AI models access',
      '2 months free'
    ],
    rolloverCredits: 100,
    priority: 4,
    metadata: {
      popular: false,
      recommended: true,
      maxCreditsPerDay: null
    }
  },
  {
    name: 'business_yearly',
    displayName: 'Business Plan (Yearly)',
    description: 'Business plan with 2 months free',
    planType: 'yearly',
    credits: 12000, // 1000 * 12 months
    price: 7990, // 10 months price
    currency: 'INR',
    features: [
      '1000 credits per month (12000 total)',
      'Rollover up to 500 unused credits',
      'All image styles available',
      'API access',
      'Custom branding options',
      'Dedicated support',
      '2 months free'
    ],
    rolloverCredits: 500,
    priority: 5,
    metadata: {
      popular: false,
      recommended: false,
      maxCreditsPerDay: null
    }
  }
];

// Seed function
const seedPricingPlans = async () => {
  try {
    await connectDB();

    // Clear existing plans
    await PricingPlan.deleteMany({});
    console.log('Cleared existing pricing plans');

    // Insert new plans
    const createdPlans = await PricingPlan.insertMany(pricingPlans);
    console.log(`Created ${createdPlans.length} pricing plans`);

    // Display created plans
    createdPlans.forEach(plan => {
      console.log(`- ${plan.displayName} (${plan.planType}): ₹${plan.price} for ${plan.credits} credits`);
    });

    console.log('\nPricing plans seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding pricing plans:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedPricingPlans();
}

module.exports = { seedPricingPlans, pricingPlans };
