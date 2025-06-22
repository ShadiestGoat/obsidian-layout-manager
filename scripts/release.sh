#!/usr/bin/env bash
set -euo pipefail

base="$(dirname $0)"

gh auth status

dist_dir="$base/../dist"
rm -r "$dist_dir" || echo "dist doesn't exist, continuing"

OUTPUT="$dist_dir" PROJECT_DIR="$(readlink -e "$base/..")" node "$base"/esbuild.config.mjs production
if ! [[ -f "$dist_dir/main.js" ]]; then
	echo "Error! Failed to compile for some reason, aborting"
	exit 1
fi

cur_version=$(yq '.version' "$base"/../package.json -oy)
ver_split=(${cur_version//./ })

ver_type=`gum choose \
	--header 'What kind of version bump is this?' \
	"Breaking ($((${ver_split[0]}+1)).${ver_split[1]}.${ver_split[2]})" \
	"Feature (${ver_split[0]}.$((${ver_split[1]}+1)).${ver_split[2]})" \
	"Bugfix (${ver_split[0]}.${ver_split[1]}.$((${ver_split[2]}+1)))"
`
new_version=${ver_type#* }
new_version=${new_version#(}
new_version=${new_version%)}

if ! gum confirm "So, bump $cur_version to ${new_version}?"; then
	exit 1
fi

yq ".version=\"$new_version\"" "$base"/../package.json -ioj
yq ".version=\"$new_version\"" "$base"/../manifest.json -ioj

min_app=$(yq '.minAppVersion' "$base"/../manifest.json -oy)

yq ".\"$new_version\" = \"$min_app\"" "$base"/../versions.json -ioj

git -C "$base/.." add './package.json'
git -C "$base/.." add './manifest.json'
git -C "$base/.." add './versions.json'
git -C "$base/.." commit -m "Release $new_version" --allow-empty
git -C "$base/.." push
git -C "$base/.." tag "$new_version" origin
git -C "$base/.." push --tags

gh release create "$new_version" --fail-on-no-commits --verify-tag --title "$new_version" --notes "" \
	"$base"/../manifest.json \
	"$dist_dir"/styles.css \
	"$dist_dir"/main.js
