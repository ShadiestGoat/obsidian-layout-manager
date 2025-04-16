set -euo pipefail

base="$(dirname $0)"

new_version=$(yq '.version' "$base"/../package.json -oy)
yq ".version=\"$new_version\"" "$base"/../manifest.json -ioj

min_app=$(yq '.minAppVersion' "$base"/../manifest.json -oy)

dist_dir="$base/../dist"

yq ".\"$new_version\" = \"$min_app\"" "$base"/../versions.json -ioj

OUTPUT="$dist_dir" PROJECT_DIR="$(readlink -e "$base/..")" node "$base"/esbuild.config.mjs production

git -C "$base/.." add './package.json'
git -C "$base/.." add './manifest.json'
git -C "$base/.." add './versions.json'
git -C "$base/.." commit -m "Release $new_version" --allow-empty
git -C "$base/.." push
git -C "$base/.." tag "$new_version" origin
git -C "$base/.." push --tags

gh release create "$new_version" --fail-on-no-commits --verify-tag --title "$new_version" --notes "" -R ShadiestGoat/obsidian-simple-password \
	"$base"/../manifest.json \
	"$dist_dir"/styles.css \
	"$dist_dir"/main.js
