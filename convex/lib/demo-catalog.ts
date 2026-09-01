export type DemoCatalogTrack = {
  artist: string;
  title: string;
  year: number;
  youtubeVideoId: string;
};

const DEMO_CATALOG_DATA = `Chuck Berry|Johnny B. Goode|1958|Uf4rxCB4lys
Ben E. King|Stand by Me|1961|hwZNL7QVJjE
Aretha Franklin|Respect|1967|6FOUqQt3Kg0
David Bowie|Space Oddity|1969|iYYRH4apXDo
Earth, Wind & Fire|September|1978|Gs069dndIYk
ABBA|Dancing Queen|1976|xFrGuyw1V8s
Queen|Don't Stop Me Now|1978|HgzGwKwLmgM
The Clash|London Calling|1979|EfK-WX2pa8c
a-ha|Take on Me|1985|djV11Xbc914
Whitney Houston|I Wanna Dance with Somebody|1987|eH3giaIzONA
R.E.M.|Losing My Religion|1991|xwtdhWltSIg
Radiohead|Creep|1992|XFkzRNyygfk
The Cranberries|Zombie|1994|6Ejga4kJUts
Daft Punk|Around the World|1997|K0HSD_i2DvA
Outkast|Hey Ya!|2003|PWgvGjAhvIw
Gorillaz|Feel Good Inc.|2005|HyHNuVaZJ-k
The White Stripes|Seven Nation Army|2003|0J2QdDbelmY
M.I.A.|Paper Planes|2007|ewRjZoRtu0Y
Beyoncé|Single Ladies (Put a Ring on It)|2008|4m1EFMoRFvY
Gotye feat. Kimbra|Somebody That I Used to Know|2011|8UVNT4wvIGY
Arctic Monkeys|Do I Wanna Know?|2013|bpOSxM0rNPM
Rosalía|Malamente|2018|Rht7rBHuXW8
Dua Lipa|Don't Start Now|2019|oygrmJFKYZY
Olivia Rodrigo|drivers license|2021|ZmDBbnmKpqQ`;

const parseDemoTrack = (row: string): DemoCatalogTrack => {
  const [artist, title, rawYear, youtubeVideoId] = row.split("|");
  const year = Number(rawYear);

  if (!(artist && title && youtubeVideoId && Number.isInteger(year))) {
    throw new Error(`Invalid demo catalog row: ${row}`);
  }

  return { artist, title, year, youtubeVideoId };
};

/**
 * Small, independently selected catalog for local development and evaluation.
 * It contains factual metadata and external playback references, never audio files.
 */
export const DEMO_CATALOG: readonly DemoCatalogTrack[] =
  DEMO_CATALOG_DATA.split("\n").map(parseDemoTrack);
