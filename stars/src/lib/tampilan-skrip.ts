export const KUNCI_TAMPILAN = "stars-tampilan";

/** Dijalankan sebelum halaman tampil agar tema tidak berkedip saat memuat. */
export const SKRIP_TAMPILAN = `try{var s=JSON.parse(localStorage.getItem("${KUNCI_TAMPILAN}")||"{}"),d=document.documentElement;if(s.gelap)d.classList.add("dark");d.dataset.latar=s.latar===2?"2":"1"}catch(e){document.documentElement.dataset.latar="1"}`;
