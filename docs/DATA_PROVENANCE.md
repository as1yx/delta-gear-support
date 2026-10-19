# Data provenance / 数据来源

This public repository uses project-authored synthetic fixtures only. Its 8 groups and 16 variants are fictional, including their names, prices, readiness scores and stock. They are MIT licensed as part of this project and are intended to exercise catalog, condition and support flows.

`lib/catalog-seed.json` and the `INITIAL_CATALOG` embedded in `public/store/index.html` contain the same fixture. The default stock of 200 is simulation data, not a market or personal inventory observation. These values do not establish official game mechanics or current prices.

No website scraping runs in this repository. Importing user data requires that the user has the appropriate rights to use it; importing does not automatically grant the project permission to redistribute that data. Local imports are not submitted to this repository automatically.

If future datasets are added, record their source, license or permission basis, units, timestamp, applicable rules/version and any missing fields. Keep synthetic, user-entered and independently verified data distinguishable. Do not fill unknown real data by copying another condition's price or inventing a state.

公开版本只包含自行生成的虚构示例，不打包之前演示站所用的第三方网页摘录。两份默认数据保持一致，库存 200 只是模拟值。用户可以导入自己有权使用的数据；这些数据不会自动成为公开共享目录。后续真实数据必须标注来源、许可、时间与规则版本，缺失值保留未知。
