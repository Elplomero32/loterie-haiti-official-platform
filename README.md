
Built by https://www.blackbox.ai

---

# Loterie Haïti - Official Lottery Platform

**Loterie Haïti** is an interactive web application that provides real-time lottery results, statistics, and vendor location services for various lottery games in Haiti. The platform aims to keep users informed about the latest results while providing essential features for both players and vendors.

## Project Overview

This project consists of several HTML pages styled with Tailwind CSS, which includes the following functionalities:
- View the latest lottery results.
- Access statistics and analysis of lottery patterns.
- Find authorized lottery vendors using integrated maps.
- Register as a lottery vendor.
- User login and registration pages.

## Installation

To run the application locally, follow these steps:

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/loterie-haiti.git
   ```

2. Navigate into the project directory:
   ```bash
   cd loterie-haiti
   ```

3. Open the `index.html` file using any web browser, or set up a local server to view the project.

## Usage

Once you have the application running:
- Visit `index.html` to see the latest lottery results and explore different sections of the site.
- Use the navigation menu to access results, statistics, vendor information, and news.
- Vendors can register via the vendor registration page to become a part of the network.

## Features

- **Real-time Notifications:** Users can get instant alerts for new results.
- **Statistics & Analysis:** Provides insights into lottery patterns and trends.
- **Find Vendors:** Users can locate nearest lottery sellers using an embedded map.
- **Multi-language Support:** The platform is available in four languages: Kreyòl, Français, Español, and English.

## Dependencies

The project uses the following libraries:
- [Tailwind CSS](https://tailwindcss.com/) for styling.
- [Font Awesome](https://fontawesome.com/) for icons.
- [Chart.js](https://www.chartjs.org/) for data visualization (used in the statistics page).
- [Leaflet.js](https://leafletjs.com/) for interactive maps (used in the vendors page).

## Project Structure

The project files are organized as follows:

```
loterie-haiti/
│
├── index.html                # Main landing page with latest results
├── results.html              # Page to view and filter lottery results
├── statistics.html           # Page for statistics and charts
├── vendors.html              # Page to find vendors and map
├── login.html                # User sign-in page
├── register.html             # User registration page
├── news.html                 # News and announcements page
├── vendor-registration.html   # Vendor registration page
│
├── assets/                   # Directory for additional assets (if any)
│   ├── css/                  # Custom CSS files (if any)
│   └── js/                   # Custom JavaScript files (if any)
│
├── README.md                 # Project documentation
└── package.json              # Project metadata and dependencies
```

Feel free to modify the files as needed or add new functionalities to improve the platform further!