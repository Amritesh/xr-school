# Indian currency reference pictures

Source: Reserve Bank of India. Retrieved 4 September 2026.
These are pictures of real currency designs, not AI-generated artwork. Banknote
specimen markings and zero serial numbers are preserved. This lesson is for
on-screen education, not printing or creating currency. RBI retains its rights;
source attribution is not a claim of an open-content licence or RBI endorsement.
Review reuse permissions before wider commercial distribution.

## Coins — 2011 rupee-symbol series

[RBI coin museum](https://www.rbi.org.in/Scripts/restrospectcoins.aspx).
The denomination/value side is called `front` in this lesson; the RBI catalogue
calls it the reverse. The other side shows the Lion Capital.

Original URL prefix: `https://www.rbi.org.in/scripts/images/`

| Denomination | Value side | Other side |
|---|---|---|
| ₹1 | RupeeSymbol19022019_8.png | RupeeSymbol19022019_7.png |
| ₹2 | RupeeSymbol19022019_6.png | RupeeSymbol19022019_5.png |
| ₹5 | RupeeSymbol19022019_4.png | RupeeSymbol19022019_3.png |
| ₹10 | RupeeSymbol19022019_2.png | RupeeSymbol19022019_1.png |

## Banknotes — Mahatma Gandhi (New) Series

| Denomination | RBI reference page | Front/back originals, relative to `https://rbi.org.in/cw/` |
|---|---|---|
| ₹10 | [₹10](https://rbi.org.in/cw/rupees-ten.aspx) | images/Rs10/10-note-front.png, images/Rs10/10-note-back.png |
| ₹20 | [₹20](https://rbi.org.in/cw/rupees-twenty.aspx) | images/Rs20/20-note-front.png, images/Rs20/20-note-back.png |
| ₹50 | [₹50](https://rbi.org.in/cw/rupees-fifty.aspx) | images/Rs50/50-note-front.png, images/Rs50/50-note-back.png |
| ₹100 | [₹100](https://rbi.org.in/cw/rupees-one-hundred.aspx) | images/Rs100/100-note-front-old.png, images/Rs100/100-note-back.png |
| ₹200 | [₹200](https://rbi.org.in/cw/rupees-two-hundred.aspx) | images/Rs200/200-note-front.png, images/Rs200/200-note-back.png |
| ₹500 | [RBI banknote museum](https://www.rbi.org.in/Scripts/pm_republicindia.aspx) | https://www.rbi.org.in/scripts/images/RIBN22072019_50.jpg |

The ₹100 source filename includes `old`, but the actual image is the lavender
Mahatma Gandhi (New) Series specimen shown on the referenced page. The ₹500
museum image contains both sides: the two photographs are separated at their
existing white gutter, without removing the specimen text.

`scripts/prepare-money-photos.mjs` converts downloaded sources to WebP, at a
maximum width of 960 px without upscaling. It archives the unchanged originals in
the ignored `tmp/money-image-originals` directory. No currency artwork is redrawn.
Other valid coin/note designs also exist; these pictures are representative examples.
