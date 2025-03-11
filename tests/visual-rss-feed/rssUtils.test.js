const {
    getImageFromRSSOrDefault,
    getRSSMetadata,
    findRSSFeed
} = require('../utils/rssUtils');

async function testRSSUtils() {
    const url = 'https://news.ycombinator.com';
    
    console.log('Testing RSS feed detection...');
    const feedUrl = await findRSSFeed(url);
    console.log('Feed URL:', feedUrl);

    console.log('\nTesting RSS metadata...');
    const metadata = await getRSSMetadata(url);
    console.log('Metadata:', metadata);

    console.log('\nTesting image detection...');
    const image = await getImageFromRSSOrDefault(url);
    console.log('Image URL:', image);
}

testRSSUtils().catch(console.error);