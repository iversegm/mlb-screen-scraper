const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs')

const urls = ['https://www.mlb.com/player/albert-pujols-405395', 'https://www.mlb.com/player/jose-berrios-621244', 'https://www.mlb.com/player/randy-dobnak-677976'];
const rosterUrl = 'http://m.twins.mlb.com/min/roster/40-man/';
const domainUrl = 'https://www.mlb.com';

buildRosterProfiles(rosterUrl)

// getRosterUrls('http://m.twins.mlb.com/min/roster/40-man/');

function buildRosterProfiles(rosterUrl) {
  getRosterUrls(rosterUrl).then((urls) => {
    buildAllProfiles(urls);
  });
}

async function getRosterUrls(url) {
  let urls = [];
  await axios(url).then(response => {
    const html = response.data;
    const $ = cheerio.load(html)
  
    const urlItems = $('.roster_table > tbody > tr > td > a');
    let keys = Object.keys(urlItems);
    urls = keys.map((key) => {
      if (urlItems[key].attribs) {
        return urlItems[key].attribs.href;
      }
    });
  })
  .catch(console.error);
  urls = urls.filter((x) => x);

  return urls.map((url) => (domainUrl + url));
}

async function buildAllProfiles(playerUrls) {
  let promiseArray = playerUrls.map((playerUrl) => getPlayerProfile(playerUrl));

  Promise.all(promiseArray).then((profiles) => {
    let playerProfiles = {};
    profiles.forEach(function(profile) {
      playerProfiles[profile.fullname] = profile;
      console.log(playerProfiles);
    });
    fs.writeFileSync('test.json', JSON.stringify(playerProfiles));
  });
}

async function getPlayerProfile(url) {
  let profile = {};
  await axios(url).then(response => {
    const html = response.data;
    const $ = cheerio.load(html)
  
    profile = buildVitals({}, $);
    profile = buildBio(profile, $);
  
    profile = transformProfile(profile);
  })
  .catch(console.error);

  return profile;
}

function buildVitals(profile, $) {
  const vitalsItems = $('.player-header--vitals > ul > li');
  profile.position = vitalsItems["0"] ? vitalsItems["0"].firstChild.data : '';
  profile.batThrow = vitalsItems["1"] ? vitalsItems["1"].firstChild.data : '';
  profile.heightWeight = vitalsItems["2"] ? vitalsItems["2"].firstChild.data : '';

  return profile;
}

function buildBio(profile, $) {
  const bioItems = $('.player-bio > ul > li');
  let bioKeys = Object.keys(bioItems);
  bioKeys.forEach(function(key) {
    let item = bioItems[key];
    if (item && item.children  && item.children[0] && item.children[0].children) {
      let prop = item.children[0].children[0].data.trim();
      profile[prop.toLowerCase().replace(":", "")] = item.children[1].data.trim();
    }
  });

  return profile;
}

function transformProfile(profile) {
  if (profile.debut) {
    profile.age = getAge(profile.born);
  }

  if (profile.debut) {
    profile.yearsPlayed = getYearsPlayed(profile.debut);
  }

  if (profile.draft) {
    profile.yearsInMlb = getYearsInMlb(profile.draft);
  }

  if (profile.heightWeight) {
    let splitValues = profile.heightWeight.split("/");
    profile.height = splitValues[0];
    profile.weight = splitValues[1];
  }

  return profile;
}

function getAge(bornValue) {
  let items = bornValue.split(" ");
  let bornDate = new Date(items[0]);
  return dateDiff(bornDate);
}

function getYearsPlayed(debut) {
  let debutDate = new Date(debut);
  return dateDiff(debutDate);
}

function getYearsInMlb(draft) {
  let items = draft.split(" ");
  return (new Date).getFullYear() - parseInt(items[0]);
}

function dateDiff(date) {
  let now = new Date;
  let diff = now.getFullYear() - date.getFullYear();

  if (now.getMonth() > date.getMonth()) {
    diff++;
  } else if (now.getMonth() === date.getMonth()) {
    if (now.getDate() >= date.getDate()) {
      diff++;
    }
  }

  return diff;
}