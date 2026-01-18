<template>
  <div
    class="flex flex-col justify-center items-stretch bg-purple-900 p-4 sm:p-20 min-h-screen antialiased"
  >
    <div
      class="sm:flex sm:flex-row justify-center bg-gray-900 shadow-xl p-5 sm:p-20 rounded-3xl md:grow"
    >
      <!-- Admin Token Modal -->
      <div
        v-if="state.showTokenModal"
        class="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-75 p-4"
      >
        <div
          class="bg-gray-800 shadow-2xl p-8 border border-gray-700 rounded-3xl w-full max-w-md"
        >
          <h2 class="mb-6 font-bold text-white text-2xl text-center">
            Authorization Required
          </h2>
          <p class="mb-6 text-gray-400 text-sm text-center">
            Please enter your ADMIN_TOKEN to access the configuration page.
          </p>
          <div class="space-y-4">
            <v-input
              type="password"
              v-model="state.adminToken"
              placeholder="Admin Token"
              @keyup.enter="saveToken"
              class="w-full h-12"
            />
            <v-button
              @click="saveToken"
              variation="primary"
              class="py-3 w-full"
            >
              Authorize
            </v-button>
          </div>
        </div>
      </div>

      <div class="flex flex-col self-center lg:p-10 xl:max-w-lg sm:max-w-5xl">
        <div class="hidden lg:flex flex-col self-start text-white">
          <h3>
            <img src="/stremio.png" alt="Stremio" />
          </h3>
          <h1 class="my-3 font-semibold text-4xl">Streaming Catalogs</h1>
          <p class="opacity-75 pr-3 text-sm">
            Select all your favourite streaming services to add their catalogs
            to Stremio!
          </p>
          <v-button
            class="mt-8 py-2"
            @click="openUrl('https://ko-fi.com/rab1t')"
          >
            <img
              class="mr-2 w-8"
              src="https://storage.ko-fi.com/cdn/brandasset/kofi_s_logo_nolabel.png"
            />
            <span>Support me on Ko-fi</span>
          </v-button>
        </div>
      </div>

      <div class="flex justify-center self-center">
        <div>
          <div class="bg-gray-800 mx-auto p-12 rounded-3xl w-96">
            <div class="mb-7">
              <h3 class="font-semibold text-gray-100 text-2xl">
                Configure addon
                <Popper
                  hover
                  content="For questions, join our Discord"
                  class="text-sm"
                >
                  <a
                    href="https://discord.gg/uggmYJ7jVX"
                    target="_blank"
                    class="text-purple-700 hover:text-purple-600 text-sm"
                    >(?)</a
                  >
                </Popper>
              </h3>
            </div>
            <div class="text-gray-300">
              <form class="space-y-6" @submit.prevent="installAddon">
                <!-- Language Selection -->
                <div class="pb-6 border-gray-700 border-b">
                  <p class="mb-1 text-gray-500 text-sm">Addon Language:</p>
                  <select
                    v-model="state.language"
                    class="bg-gray-900 px-4 py-3 border border-gray-700 focus:border-purple-400 rounded-lg focus:outline-none w-full text-gray-200 text-sm"
                  >
                    <option
                      v-for="(name, code) in languages"
                      :key="code"
                      :value="code"
                    >
                      {{ name }}
                    </option>
                  </select>
                  <p class="mt-2 text-gray-600 text-xs">
                    This controls the language of titles, descriptions and
                    posters.
                  </p>
                </div>

                <!-- Netflix Top 10 Section -->
                <div
                  v-if="state.enableNetflixTop10"
                  class="pb-6 border-gray-700 border-b"
                >
                  <p class="mb-3 text-gray-500 text-sm">Netflix Top 10:</p>
                  <div class="space-y-3">
                    <label
                      class="flex items-center text-gray-300 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        v-model="state.netflixTop10Global"
                        class="mr-2 rounded"
                      />
                      Global Top 10
                    </label>
                    <div>
                      <label
                        class="flex items-center mb-2 text-gray-300 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          v-model="state.netflixTop10Country"
                          class="mr-2 rounded"
                        />
                        Country Top 10
                      </label>
                      <select
                        v-model="state.netflixTop10CountryCode"
                        :disabled="!state.netflixTop10Country"
                        class="bg-gray-900 disabled:opacity-50 px-4 py-3 border border-gray-700 focus:border-purple-400 rounded-lg focus:outline-none w-full text-gray-200 text-sm disabled:cursor-not-allowed"
                      >
                        <option value="">Select country...</option>
                        <option
                          v-for="(name, code) in netflixTop10Countries"
                          :key="code"
                          :value="code"
                        >
                          {{ name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Provider Selection Section -->
                <div class="pb-6 border-gray-700 border-b">
                  <div class="mb-3">
                    <p class="mb-1 text-gray-500 text-sm">
                      Filter providers by country:
                    </p>
                    <select
                      v-model="state.country"
                      class="bg-gray-900 px-4 py-3 border border-gray-700 focus:border-purple-400 rounded-lg focus:outline-none w-full text-gray-200 text-sm"
                    >
                      <option
                        v-for="country in getCountries()"
                        :key="country"
                        :value="country"
                      >
                        {{ country }}
                      </option>
                    </select>
                  </div>

                  <div class="gap-2 grid grid-cols-4 grid-rows-2">
                    <Popper
                      v-show="showProvider('nfx')"
                      hover
                      content="Netflix"
                    >
                      <img
                        src="/netflix.webp"
                        @click="toggle('nfx')"
                        class="rounded-xl"
                        :class="!isActive('nfx') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('hbm')"
                      hover
                      content="HBO Max"
                    >
                      <img
                        src="/hbo.webp"
                        @click="toggle('hbm')"
                        class="rounded-xl"
                        :class="!isActive('hbm') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('dnp')"
                      hover
                      content="Disney+"
                    >
                      <img
                        src="/disney.webp"
                        @click="toggle('dnp')"
                        class="rounded-xl"
                        :class="!isActive('dnp') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('amp')"
                      hover
                      content="Prime Video"
                    >
                      <img
                        src="/prime.webp"
                        @click="toggle('amp')"
                        class="rounded-xl"
                        :class="!isActive('amp') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('atp')"
                      hover
                      content="Apple TV+"
                    >
                      <img
                        src="/apple.webp"
                        @click="toggle('atp')"
                        class="rounded-xl"
                        :class="!isActive('atp') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('pmp')"
                      hover
                      content="Paramount+"
                    >
                      <img
                        src="/paramount.webp"
                        @click="toggle('pmp')"
                        class="rounded-xl"
                        :class="!isActive('pmp') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('pcp')"
                      hover
                      content="Peacock Premium"
                    >
                      <img
                        src="/peacock.webp"
                        @click="toggle('pcp')"
                        class="rounded-xl"
                        :class="!isActive('pcp') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('hlu')" hover content="Hulu">
                      <img
                        src="/hulu.webp"
                        @click="toggle('hlu')"
                        class="rounded-xl"
                        :class="!isActive('hlu') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('nfk')"
                      hover
                      content="Netflix Kids"
                    >
                      <img
                        src="/netflixkids.webp"
                        @click="toggle('nfk')"
                        class="rounded-xl"
                        :class="!isActive('nfk') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('cts')"
                      hover
                      content="Curiosity Stream"
                    >
                      <img
                        src="/curiositystream.webp"
                        @click="toggle('cts')"
                        class="rounded-xl"
                        :class="!isActive('cts') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('mgl')"
                      hover
                      content="MagellanTV"
                    >
                      <img
                        src="/magellan.webp"
                        @click="toggle('mgl')"
                        class="rounded-xl"
                        :class="!isActive('mgl') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('cru')"
                      hover
                      content="Crunchyroll"
                    >
                      <img
                        src="/crunchyroll.webp"
                        @click="toggle('cru')"
                        class="rounded-xl"
                        :class="!isActive('cru') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('hay')" hover content="Hayu">
                      <img
                        src="/hayu.webp"
                        @click="toggle('hay')"
                        class="rounded-xl"
                        :class="!isActive('hay') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('clv')"
                      hover
                      content="Clarovideo"
                    >
                      <img
                        src="/claro.webp"
                        @click="toggle('clv')"
                        class="rounded-xl"
                        :class="!isActive('clv') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('gop')"
                      hover
                      content="Globoplay"
                    >
                      <img
                        src="/globo.webp"
                        @click="toggle('gop')"
                        class="rounded-xl"
                        :class="!isActive('gop') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('jhs')"
                      hover
                      content="JioHotstar"
                    >
                      <img
                        src="/jiohotstar.webp"
                        @click="toggle('jhs')"
                        class="rounded-xl"
                        :class="!isActive('jhs') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('zee')" hover content="Zee5">
                      <img
                        src="/zee5.webp"
                        @click="toggle('zee')"
                        class="rounded-xl"
                        :class="!isActive('zee') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('nlz')" hover content="NLZIET">
                      <img
                        src="/nlziet.webp"
                        @click="toggle('nlz')"
                        class="rounded-xl"
                        :class="!isActive('nlz') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('vil')"
                      hover
                      content="Videoland"
                    >
                      <img
                        src="/videoland.webp"
                        @click="toggle('vil')"
                        class="rounded-xl"
                        :class="!isActive('vil') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('sst')"
                      hover
                      content="SkyShowtime"
                    >
                      <img
                        src="/skyshowtime.webp"
                        @click="toggle('sst')"
                        class="rounded-xl"
                        :class="!isActive('sst') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('cpd')" hover content="Canal+">
                      <img
                        src="/canal-plus.webp"
                        @click="toggle('cpd')"
                        class="rounded-xl"
                        :class="!isActive('cpd') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('stz')" hover content="Starz">
                      <img
                        src="/starz.webp"
                        @click="toggle('stz')"
                        class="rounded-xl"
                        :class="!isActive('stz') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('dpe')"
                      hover
                      content="Discovery+"
                    >
                      <img
                        src="/discovery-plus.webp"
                        @click="toggle('dpe')"
                        class="rounded-xl"
                        :class="!isActive('dpe') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('mbi')" hover content="Mubi">
                      <img
                        src="/mubi.webp"
                        @click="toggle('mbi')"
                        class="rounded-xl"
                        :class="!isActive('mbi') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('vik')"
                      hover
                      content="Rakuten Viki"
                    >
                      <img
                        src="/viki.webp"
                        @click="toggle('vik')"
                        class="rounded-xl"
                        :class="!isActive('vik') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('sgo')" hover content="Sky Go">
                      <img
                        src="/skygo.webp"
                        @click="toggle('sgo')"
                        class="rounded-xl"
                        :class="!isActive('sgo') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('sonyliv')"
                      hover
                      content="Sony Liv"
                    >
                      <img
                        src="/sonyliv.webp"
                        @click="toggle('sonyliv')"
                        class="rounded-xl"
                        :class="!isActive('sonyliv') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('mp9')"
                      hover
                      content="Movistar+"
                    >
                      <img
                        src="/movistar.webp"
                        @click="toggle('mp9')"
                        class="rounded-xl"
                        :class="!isActive('mp9') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('shd')"
                      hover
                      content="Shudder"
                    >
                      <img
                        src="/shudder.webp"
                        @click="toggle('shd')"
                        class="rounded-xl"
                        :class="!isActive('shd') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('bbo')"
                      hover
                      content="BritBox"
                    >
                      <img
                        src="/britbox.webp"
                        @click="toggle('bbo')"
                        class="rounded-xl"
                        :class="!isActive('bbo') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('act')"
                      hover
                      content="Acorn TV"
                    >
                      <img
                        src="/acorntv.webp"
                        @click="toggle('act')"
                        class="rounded-xl"
                        :class="!isActive('act') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('itv')" hover content="ITVX">
                      <img
                        src="/itvx.webp"
                        @click="toggle('itv')"
                        class="rounded-xl"
                        :class="!isActive('itv') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('bbc')"
                      hover
                      content="BBC iPlayer"
                    >
                      <img
                        src="/bbciplayer.webp"
                        @click="toggle('bbc')"
                        class="rounded-xl"
                        :class="!isActive('bbc') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('al4')"
                      hover
                      content="Channel 4"
                    >
                      <img
                        src="/channel4.webp"
                        @click="toggle('al4')"
                        class="rounded-xl"
                        :class="!isActive('al4') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('crc')"
                      hover
                      content="Criterion Channel"
                    >
                      <img
                        src="/criterion.webp"
                        @click="toggle('crc')"
                        class="rounded-xl"
                        :class="!isActive('crc') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper v-show="showProvider('iqi')" hover content="iQIYI">
                      <img
                        src="/iqiyi.webp"
                        @click="toggle('iqi')"
                        class="rounded-xl"
                        :class="!isActive('iqi') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                    <Popper
                      v-show="showProvider('sha')"
                      hover
                      content="Shahid VIP"
                    >
                      <img
                        src="/shahid.webp"
                        @click="toggle('sha')"
                        class="rounded-xl"
                        :class="!isActive('sha') ? 'inactive' : ''"
                        role="button"
                      />
                    </Popper>
                  </div>
                </div>

                <!-- RPDB Key Section -->
                <div>
                  <div class="flex">
                    <v-input
                      type="text"
                      class="rounded-r-none h-[46px]"
                      placeholder="RPDB key (optional)"
                      pattern="t[0-3]-[a-zA-Z0-9\-]+"
                      v-model="state.rpdbKey"
                    />
                    <v-button
                      type="button"
                      class="border-l-0 rounded-l-none w-auto h-[46px]"
                      @click="openUrl('https://ratingposterdb.com/')"
                      >?
                    </v-button>
                  </div>
                </div>

                <!-- Install Button -->
                <div class="pt-1">
                  <v-button type="submit" variation="primary"
                    >Install addon</v-button
                  >
                </div>

                <div v-if="state.addonUrl" class="mt-4">
                  <p class="mb-2 text-gray-500 text-sm">Manual install URL:</p>
                  <div class="flex">
                    <v-input
                      type="text"
                      class="rounded-r-none h-[46px] text-sm"
                      :value="state.addonUrl"
                      readonly
                    />
                    <v-button
                      type="button"
                      class="border-l-0 rounded-l-none w-auto h-[46px]"
                      @click="copyUrl"
                    >
                      Copy
                    </v-button>
                  </div>
                  <p class="mt-1 text-gray-600 text-xs">
                    If the automatic install doesn't work, copy this URL and
                    paste it in Stremio's addon installation
                  </p>
                </div>
              </form>
            </div>
          </div>
          <div class="mt-4 text-gray-400 text-xs text-center">
            <a
              href="https://github.com/rleroi/Stremio-Streaming-Catalogs-Addon"
              rel="noopener"
              target="_blank"
              title="Contribute on GitHub"
              class="fill-gray-400 hover:fill-gray-500 mr-2"
            >
              <svg
                class="inline-block"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </a>
            <a
              href="https://ko-fi.com/rab1t"
              rel="noopener"
              target="_blank"
              title="Support me on Ko-fi"
            >
              <img
                class="inline-block"
                width="48px"
                src="https://storage.ko-fi.com/cdn/brandasset/kofi_s_logo_nolabel.png"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from "vue";
import regionsToCountries from "./regions-to-countries.json";
import VButton from "./components/VButton.vue";
import VInput from "./components/VInput.vue";

const regions = {
  "United States": [
    "nfx",
    "nfk",
    "dnp",
    "amp",
    "atp",
    "hbm",
    "cru",
    "pmp",
    "mgl",
    "cts",
    "hlu",
    "pcp",
    "stz",
    "dpe",
    "mbi",
    "vik",
    "shd",
    "bbo",
    "act",
    "crc",
    "iqi",
    "sha",
  ],
  "United Kingdom": [
    "nfx",
    "nfk",
    "dnp",
    "amp",
    "atp",
    "hbm",
    "cru",
    "mgl",
    "cts",
    "mbi",
    "itv",
    "bbc",
    "al4",
    "bbo",
    "act",
  ],
  Brazil: [
    "nfx",
    "nfk",
    "dnp",
    "atp",
    "amp",
    "pmp",
    "hbm",
    "cru",
    "clv",
    "gop",
    "mgl",
    "cts",
    "mbi",
  ],
  India: [
    "nfx",
    "nfk",
    "atp",
    "amp",
    "cru",
    "zee",
    "jhs",
    "mgl",
    "cts",
    "dpe",
    "sonyliv",
    "mbi",
    "vik",
  ],
  Turkey: ["nfx", "nfk", "dnp", "amp", "cru", "hbm", "mgl", "cts", "mbi"],
  Netherlands: [
    "nfx",
    "nfk",
    "dnp",
    "amp",
    "atp",
    "hbm",
    "cru",
    "hay",
    "vil",
    "sst",
    "mgl",
    "cts",
    "nlz",
    "dpe",
    "mbi",
  ],
  France: ["nfx", "nfk", "dnp", "amp", "atp", "hbm", "hay", "cpd", "mbi"],
  Germany: [
    "nfx",
    "nfk",
    "dnp",
    "amp",
    "atp",
    "hbm",
    "cru",
    "hay",
    "mgl",
    "cts",
    "sgo",
    "dpe",
    "vik",
  ],
  Spain: ["nfx", "nfk", "dnp", "amp", "atp", "hbm", "cru", "mp9"],
  Any: [
    "nfx",
    "nfk",
    "dnp",
    "amp",
    "atp",
    "hbm",
    "pmp",
    "hlu",
    "pcp",
    "clv",
    "gop",
    "zee",
    "jhs",
    "hay",
    "vil",
    "sst",
    "mgl",
    "cts",
    "cru",
    "nlz",
    "cpd",
    "stz",
    "dpe",
    "mbi",
    "vik",
    "sgo",
    "sonyliv",
    "mp9",
    "shd",
    "bbo",
    "act",
    "itv",
    "bbc",
    "al4",
    "crc",
    "iqi",
    "sha",
  ],
};

// Netflix Top 10 available countries (ISO code -> Display name)
const netflixTop10Countries = {
  AR: "Argentina",
  AU: "Australia",
  AT: "Austria",
  BS: "Bahamas",
  BH: "Bahrain",
  BD: "Bangladesh",
  BE: "Belgium",
  BO: "Bolivia",
  BR: "Brazil",
  BG: "Bulgaria",
  CA: "Canada",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  GP: "Guadeloupe",
  GT: "Guatemala",
  HN: "Honduras",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KE: "Kenya",
  KW: "Kuwait",
  LV: "Latvia",
  LB: "Lebanon",
  LT: "Lithuania",
  LU: "Luxembourg",
  MY: "Malaysia",
  MV: "Maldives",
  MT: "Malta",
  MQ: "Martinique",
  MU: "Mauritius",
  MX: "Mexico",
  MA: "Morocco",
  NL: "Netherlands",
  NC: "New Caledonia",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NG: "Nigeria",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PA: "Panama",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  ZA: "South Africa",
  KR: "South Korea",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  TW: "Taiwan",
  TH: "Thailand",
  TT: "Trinidad and Tobago",
  TR: "Türkiye",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  VE: "Venezuela",
  VN: "Vietnam",
};

const languages = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ru: "Русский",
  tr: "Türkçe",
  hi: "हिन्दी",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

// Generate reverse mapping (display name -> ISO code) from netflixTop10Countries
// Also include common variations/aliases
const countryNameToCode = Object.fromEntries(
  Object.entries(netflixTop10Countries).map(([code, name]) => [name, code]),
);
// Add common aliases
countryNameToCode["Czech Republic"] = "CZ";
countryNameToCode["Korea (South)"] = "KR";
countryNameToCode["South Korea"] = "KR";
countryNameToCode["Trinidad & Tobago"] = "TT";
countryNameToCode["Trinidad and Tobago"] = "TT";
countryNameToCode["Britain (UK)"] = "GB";
countryNameToCode["United Kingdom"] = "GB";

function getCountryCodeFromCountry(country) {
  return countryNameToCode[country] || "";
}

function getCountries() {
  return Object.keys(regions);
}

function getCountry() {
  return (
    regionsToCountries[Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone] ||
    "Any"
  );
}

function getNetflixTop10CountryCode() {
  const country = getCountry();
  if (country === "Any") {
    return "";
  }
  const countryCode = getCountryCodeFromCountry(country);
  // Check if the country code exists in netflixTop10Countries
  if (countryCode && netflixTop10Countries[countryCode]) {
    return countryCode;
  }
  return "";
}

const state = reactive({
  adminToken: "",
  showTokenModal: !!import.meta.env.VITE_ADMIN_TOKEN,
  country: getCountry(),
  language: "en",
  rpdbKey: "",
  providers: ["nfx", "dnp", "amp", "atp", "hbm"],
  enableNetflixTop10: false,
  netflixTop10Global: false,
  netflixTop10Country: false,
  netflixTop10CountryCode: getNetflixTop10CountryCode(),
  countryCode: null,
  timeStamp: null,
  addonUrl: "",
});

function openUrl(url) {
  window.open(url, "_blank", "noopener");
}

function showProvider(provider) {
  return (
    state.providers.includes(provider) ||
    regions?.[state.country]?.includes(provider)
  );
}

onMounted(() => {
  decodeUrlConfig();
});

function decodeUrlConfig() {
  const urlParts = document.location.href.split("/");
  const configure = urlParts.pop();
  if (configure !== "configure") {
    return;
  }

  try {
    const base64 = decodeURIComponent(urlParts.pop());
    const configString = atob(base64).split(":");

    // First part is now the token
    const [
      token,
      providers,
      rpdbKey,
      countryCode,
      timeStamp,
      netflixTop10Global,
      netflixTop10Country,
      netflixTop10CountryCode,
      language,
    ] = configString;

    if (token) {
      state.adminToken = token;
      state.showTokenModal = false;
    }

    state.rpdbKey = rpdbKey || "";
    state.providers = providers ? providers.split(",") : [];
    state.countryCode = countryCode || null;
    state.timeStamp = timeStamp || null;
    // Default to true for global, false for country (backward compatibility)
    state.netflixTop10Global =
      netflixTop10Global !== undefined ? netflixTop10Global === "1" : true;
    state.netflixTop10Country =
      netflixTop10Country !== undefined ? netflixTop10Country === "1" : false;
    state.netflixTop10CountryCode = netflixTop10CountryCode || "";
    state.language = language || "en";
  } catch (e) {
    console.log("No valid configuration:", e.message);
  }
}

function installAddon() {
  if (
    !state.providers.length &&
    !state.netflixTop10Global &&
    !state.netflixTop10Country
  ) {
    alert("Please choose at least 1 provider or enable Netflix Top 10");

    return;
  }

  if (state.netflixTop10Country && !state.netflixTop10CountryCode) {
    alert("Please select a country for Netflix Top 10");
    return;
  }

  // Build configuration string: token:providers:rpdbKey:countryCode:timestamp:netflixTop10Global:netflixTop10Country:netflixTop10CountryCode:language
  const configParts = [
    state.adminToken || "",
    state.providers.join(","),
    state.rpdbKey,
    state.countryCode || getCountryCodeFromCountry(state.country),
    state.timeStamp || Number(new Date()),
    state.netflixTop10Global || "0",
    state.netflixTop10Country || "0",
    state.netflixTop10CountryCode || "",
    state.language || "en",
  ];

  const finalConfig = btoa(configParts.join(":"));
  state.addonUrl = `${import.meta.env.VITE_APP_URL}/${encodeURIComponent(finalConfig)}/manifest.json`;

  console.log("URL:", state.addonUrl);
  navigator.clipboard.writeText(state.addonUrl).catch(console.error);

  window.location.href = state.addonUrl.replace(/https?:\/\//, "stremio://");
}

function toggle(provider) {
  let index = state.providers.indexOf(provider);
  if (index === -1) {
    state.providers.push(provider);
  } else {
    state.providers.splice(index, 1);
  }
}

function isActive(provider) {
  return state.providers.includes(provider);
}

function saveToken() {
  if (state.adminToken.trim()) {
    state.showTokenModal = false;
  } else {
    alert("Please enter a token");
  }
}

function copyUrl() {
  navigator.clipboard
    .writeText(state.addonUrl)
    .then(() => {
      alert("URL copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy URL:", err);
      alert("Failed to copy URL. Please copy manually.");
    });
}
</script>

<style scoped>
.inactive {
  @apply opacity-30;
}
</style>
