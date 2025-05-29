## Website link: [here](https://com-480-data-visualization.github.io/BluePink/index.html)

# Project of Data Visualization (COM-480)

| Student's name                | SCIPER |
| ----------------------------- | ------ |
| Elsa Heitz                    | 316735 |
| Mahdi Fourati                 | 313078 |
| Benoit Mathey-Doret dit Doret | 324620 |

## Objective of this project

This project was conducted by **Mahdi Fourati**, **Elsa Heitz**, and **Benoît Mathey-Doret** as part of the EPFL course _Data Visualization_ during the Spring 2025 semester. Its objective is to explore and visually represent crime patterns in New York City by integrating the NYC Crime Complaint Dataset ([Kaggle link](https://www.kaggle.com/datasets/aniket0712/nypd-complaint-data-historic?resource=download)) with socio-economic information in New York ([NYC Planning link](https://www.nyc.gov/site/planning/data-maps/open-data/districts-download-metadata.page)).

Rather than only plotting crime locations, the project seeks to uncover the underlying factors that influence crime by combining spatial, temporal, and socio-economic dimensions. The primary goal is to investigate how crime rates correlate with variables such as poverty, unemployment, and demographic composition across different districts of the city.

The final outcome is an interactive, user-friendly tool designed to serve both the general public—such as residents or individuals considering a move to NYC—and policymakers. It aims to highlight crime disparities, uncover trends, and identify potential root causes. By providing data-driven insights, the project supports better-informed decisions regarding urban safety policies and resource allocation.

### Project Structure

```plaintext
BLUEPINK/
├── data/
│ ├── crimes*by_district/ # JSON files with crime data per NYC district
│ └── website_data/ # Additional data used for visualizations/statistics
│
├── html/
│ ├── about.html # About page
│ ├── crimes_correlation.html #tables with correlation (stats part)
│ ├── rank_district_top3.html #display the most dangerous districts (stats part)
│ └── statistics.html # Page for global statistics
│
├── images/ # Custom icons used for special crimes on the map
│
├── js/
│ ├── main.js # Main map rendering and interaction logic
│ ├── crimes_icones.js #custom icones for special crimes
│ ├── eco_info.js #economical information menu on the left
│ ├── economic_choropleth.js #compute color map with economical data
│ ├── filter_crimeType.js #handles dropdown crime selection
│ ├── heatmap.js #color map for crimes
│ ├── legend.js #handles the legend
│ ├── map_control.js #handles map features
│ └── provided.js #template
│
│
├── notebooks/ # Jupyter notebooks for data preprocessing and EDA
│ ├── create_data_by_district.ipynb
│ ├── data_exploration.ipynb
│ ├── dataset_creator.ipynb
│ └── Create_stats_img.ipynb
│
├── Past_milestones/ # Project milestones and deliverables
│ ├── Milestone1.pdf
│ └── Milestone2.pdf
│
├── styles/
│ ├── about.css #about page styling
│ ├── crime_filter.css
│ ├── legend.css
│ ├── statistics.css #statistics page styling
│ ├── menu_eco.css
│ └── style.css # Global styling for the website
│
├── index.html # Main
├── Milestone3.pdf
├── README.md
└── requirements.txt
```
