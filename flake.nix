{
  description = "Ancient Kingdoms mods, build pipeline and compendium website";

  inputs = {
    # Same nixpkgs release the workstation pins, so the dev shell and the host
    # system share one evaluated package set and one binary cache.
    nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.2605";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShellNoCC {
          # Node, pnpm and uv mirror .github/workflows/ci.yml. Keep both sides
          # in step when either moves.
          packages = [
            # build-pipeline. python314 matches build-pipeline/.python-version.
            pkgs.uv
            pkgs.python314

            # build-tool and its tests target net10.0. The mods under mods/
            # target net6.0, which needs the Microsoft.NETCore.App.Ref 6.0.x
            # targeting pack from NuGet rather than the .NET 6 SDK.
            pkgs.dotnetCorePackages.sdk_10_0

            # Root pnpm workspace and the SvelteKit website. pnpm switches
            # itself to the version in package.json's packageManager field.
            pkgs.nodejs_24
            pkgs.pnpm_10

            # Ad-hoc inspection of website/static/compendium.db.
            pkgs.sqlite
          ];

          env = {
            # Use the interpreter above; a uv-downloaded CPython would diverge.
            UV_PYTHON = "${pkgs.python314}/bin/python3.14";
            UV_PYTHON_DOWNLOADS = "never";

            DOTNET_CLI_TELEMETRY_OPTOUT = "1";
            DOTNET_NOLOGO = "1";
          };
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);

      checks = forAllSystems (pkgs: {
        devShell = self.devShells.${pkgs.stdenv.hostPlatform.system}.default;
      });
    };
}
