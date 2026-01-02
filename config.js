// Configuration file for Subbs Mini App
// Easy to customize channels, gifts, and pricing

export const CONFIG = {
    // Subscription tasks configuration
    channels: [
        { 
            id: 1, 
            name: 'Tech News', 
            username: '@technews', 
            link: 'https://t.me/technews',
            reward: 0 // No direct reward, only counts toward main gift
        },
        { 
            id: 2, 
            name: 'Crypto Updates', 
            username: '@cryptoupdates', 
            link: 'https://t.me/cryptoupdates',
            reward: 0
        },
        { 
            id: 3, 
            name: 'Gaming Hub', 
            username: '@gaminghub', 
            link: 'https://t.me/gaminghub',
            reward: 0
        },
        { 
            id: 4, 
            name: 'Design Daily', 
            username: '@designdaily', 
            link: 'https://t.me/designdaily',
            reward: 0
        },
        { 
            id: 5, 
            name: 'Startup Stories', 
            username: '@startupstories', 
            link: 'https://t.me/startupstories',
            reward: 0
        },
        { 
            id: 6, 
            name: 'AI Insights', 
            username: '@aiinsights', 
            link: 'https://t.me/aiinsights',
            reward: 0
        }
    ],
    
    // Gifts available for purchase
    gifts: [
        { 
            id: 1, 
            name: 'сердце', 
            emoji: '❤️', 
            cost: 15, 
            description: 'базовый подарок',
            type: 'heart'
        },
        { 
            id: 2, 
            name: 'роза', 
            emoji: '🌹', 
            cost: 25, 
            description: 'красивый подарок',
            type: 'rose'
        },
        { 
            id: 3, 
            name: 'золото', 
            emoji: '🏆', 
            cost: 50, 
            description: 'премиум подарок',
            type: 'gold'
        },
        { 
            id: 4, 
            name: 'алмаз', 
            emoji: '💎', 
            cost: 100, 
            description: 'люкс подарок',
            type: 'diamond'
        }
    ],
    
    // Task completion settings
    requiredTasks: 6, // Number of channels to subscribe to
    giftReward: 15, // Stars given for completing all tasks
    
    // Subscription verification
    subscriptionCheckDuration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    recheckInterval: 7 * 24 * 60 * 60 * 1000, // Re-check active subscriptions every 7 days
    
    // Promo order settings
    promoCostPerSub: 4.5, // Average cost per subscriber (4-5 stars)
    minPromoSubscribers: 10, // Minimum subscribers for promo order
    
    // UI Settings
    design: {
        colors: {
            background: '#FFFEF9',
            card: '#FFFFFF',
            text: '#000000',
            accent: '#FCD34D'
        },
        shadows: {
            default: '4px 4px 0px #000000',
            pressed: '2px 2px 0px #000000'
        },
        borderRadius: {
            card: '20px',
            button: '16px',
            input: '12px'
        }
    }
};

// For use in app.js (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
