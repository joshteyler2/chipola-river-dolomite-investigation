# Florida water-quality criteria and station calculations

**Retrieved/checked:** September 2, 2026
**Purpose:** Reproducibility notes for interpreting the Magnolia Road and SR 274 Water Quality Portal exports. This is not an official rule publication or a legal determination.

## Official current rules

- [Rule 62-302.530, Table: Surface Water Quality Criteria](https://flrules.org/gateway/readFile.asp?sid=0&tid=30201161&type=1&file=62-302.530.doc), effective November 25, 2025.
- [Rule 62-302.531, Numeric Nutrient Criteria](https://flrules.org/gateway/readFile.asp?sid=0&tid=30201258&type=1&file=62-302.531.doc), effective November 25, 2025.
- [Rule 62-302.533, Dissolved Oxygen Criteria](https://flrules.org/gateway/readFile.asp?sid=0&tid=30201452&type=1&file=62-302.533.doc), effective November 25, 2025.

Key interpretive points:

- Class III fresh-water pH: 6.0–8.5, with no more than a one-unit change from natural background.
- E. coli: monthly geometric mean 126 MPN/100 mL; ten-percent threshold value 410; when fewer than five samples are collected in a month, 410 functions as the single-sample maximum.
- Panhandle West freshwater DO: no more than 10 percent of daily-average saturation values may be below 67 percent. An instantaneous reading is not automatically a daily-average compliance datum. The rule is a minimum-style criterion; 123.6 percent saturation is not an exceedance of that minimum, although supersaturation can be ecologically informative.
- Panhandle West stream thresholds: annual geometric mean total phosphorus 0.06 mg/L and total nitrogen 0.67 mg/L. Application requires the rule’s annual sampling sufficiency and biological/nutrient assessment framework; a single grab is not an impairment determination.
- Annual nutrient calculations generally require at least four temporally independent samples, with seasonal representation as specified in the rule.

## Magnolia Road station, 21FLTLHR_WQX-G2TLHR0016

Source: [2025 result export](19-WQP-Magnolia-Road-2025.csv) and [station metadata](46-WQP-Magnolia-Road-Station-Metadata.csv).

Total nitrogen is calculated as reported nitrate+nitrite plus TKN:

| Date | Nitrate+nitrite | TKN | Calculated TN (mg/L) |
|---|---:|---:|---:|
| 2025-02-24 | 0.89 | 0.28 | 1.17 |
| 2025-04-03 | 1.40 | 0.45 | 1.85 |
| 2025-05-22 | 1.70 | 0.61 | 2.31 |
| 2025-07-10 | 2.20 | 0.29 | 2.49 |

Annual geometric mean TN = `(1.17 × 1.85 × 2.31 × 2.49)^(1/4)` ≈ **1.878 mg/L**.

Reported TP values were 0.032, 0.031, 0.065, and 0.024 mg/L; geometric mean ≈ **0.0353 mg/L**.

E. coli results were 195.6, 75.4, **1,553.1**, and 8.6 MPN/100 mL. The May 22 result exceeded 410; the July 10 result did not.

Interpretation: the annual TN calculation is above the regional threshold and the May E. coli is above the single-sample maximum. The station is about 5.07 straight-line miles upstream of Dolomite D-001, so these are upstream/regional conditions, not evidence that Dolomite caused them.

## SR 274 station, 21FLWQSP_WQX-31020012

Source: [2023+ result export](20-WQP-Chipola-at-SR274-Since-2023.csv) and [station metadata](47-WQP-SR274-Station-Metadata.csv).

For October 25, 2023, calculated TN = nitrate+nitrite 1.4 + TKN 0.18 = **1.58 mg/L**. TP was 0.014 mg/L; pH 8.23; DO 8.27 mg/L and 92.5 percent saturation; turbidity 1.6 NTU; TSS 3 mg/L; E. coli 23.3 MPN/100 mL.

Interpretation: the one TN value is above the 0.67 regional annual threshold, but one result cannot calculate a valid annual geometric mean or establish impairment. The other listed values do not show an obvious single-sample numeric exceedance. The station is about 6.65 straight-line miles downstream of Dolomite D-001 and cannot isolate either mine’s contribution.
