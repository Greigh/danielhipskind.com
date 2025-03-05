import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default {
  plugins: [
    postcssImport,
    postcssPresetEnv({
      stage: 1,
      features: {
        'custom-properties': true,
        'nesting-rules': true,
      },
    }),
    autoprefixer,
    cssnano({
      preset: 'default',
    }),
  ],
};
