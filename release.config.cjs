module.exports = {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      { preset: "conventionalcommits" },
    ],
    [
      "@semantic-release/release-notes-generator",
      { preset: "conventionalcommits" },
    ],
    ["@semantic-release/npm", { npmPublish: false }],
    ["@semantic-release/exec", { prepareCmd: "npm run package:win" }],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "dist/*.exe",
            label: "Blocksmith ${nextRelease.version} for Windows",
          },
        ],
      },
    ],
  ],
};
