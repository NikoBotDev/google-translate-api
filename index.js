const querystring = require('querystring');

const fetch = require('node-fetch');
const token = require('google-translate-token');

const languages = require('./languages');

async function translate(text, opts) {
  opts = opts || {};

  let e;
  [opts.from, opts.to].forEach((lang) => {
    if (lang && !languages.isSupported(lang)) {
      e = new Error();
      e.code = 400;
      e.message = 'The language \'' + lang + '\' is not supported';
    }
  });
  if (e) {
      throw e;
  }

  opts.from = opts.from || 'auto';
  opts.to = opts.to || 'en';

  opts.from = languages.getCode(opts.from);
  opts.to = languages.getCode(opts.to);
  const gToken = await token.get(text);
    let url = 'https://translate.google.com/translate_a/single';
    const data = {
      client: 't',
      sl: opts.from,
      tl: opts.to,
      hl: opts.to,
      dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
      ie: 'UTF-8',
      oe: 'UTF-8',
      otf: 1,
      ssel: 0,
      tsel: 0,
      kc: 7,
      q: text,
    };
    data[gToken.name] = gToken.value;

    url = url + '?' + querystring.stringify(data);
    return fetch(url).then(async (res) => {
      let result = {
        text: '',
        from: {
          language: {
            didYouMean: false,
            iso: '',
          },
          text: {
            autoCorrected: false,
            value: '',
            didYouMean: false,
          },
        },
        raw: '',
      };
      const body = await res.json();
      if (opts.raw) {
        result.raw = body;
      }

      body[0].forEach((obj) => {
        if (obj[0]) {
          result.text += obj[0];
        }
      });

      if (body[2] === body[8][0][0]) {
        result.from.language.iso = body[2];
      } else {
        result.from.language.didYouMean = true;
        result.from.language.iso = body[8][0][0];
      }

      if (body[7] && body[7][0]) {
        let str = body[7][0];

        str = str.replace(/<b><i>/g, '[');
        str = str.replace(/<\/i><\/b>/g, ']');

        result.from.text.value = str;

        if (body[7][5] === true) {
          result.from.text.autoCorrected = true;
        } else {
          result.from.text.didYouMean = true;
        }
      }

      return result;
    }).catch((err) => {
      let e;
      e = new Error();
      if (err.status && err.status !== 200) {
        e.code = 'BAD_REQUEST';
      } else {
        e.code = 'BAD_NETWORK';
      }
      throw e;
    });
}

module.exports = translate;
module.exports.languages = languages;
