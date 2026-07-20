// main.js: Import setup functions and configuration

import { initMap } from './map.js';
import { setupLocationServices } from './location.js';
import { AGOL_APIkey } from './config.js'; // API key stored in separate config file

// Initialize spatial interface
initMap("viewDiv", AGOL_APIkey.API_KEY)
    .then((view) => {
        console.log("Map View initialized successfully.");
            
        // Keep popups active and expandable
        view.popup.collapseEnabled = true; 

        // Load modules for expand widgets and mobile/desktop responsive behavior
        require([ 
            "esri/widgets/Expand",
            "esri/core/reactiveUtils" // I reused the reactiveUtils logic from my midterm project
        ], (Expand, reactiveUtils) => {

            // Reactive breakpoint watcher for mobile vs. desktop responsiveness
            reactiveUtils.watch(
                () => view.widthBreakpoint,
                (breakpoint) => {
                    const isMobile = breakpoint === "xsmall" || breakpoint === "small";
                    const controlPanelExpand = view.ui.find("controlPanelExpand");
                    
                    if (isMobile) {
                        // Allow popups to float cleanly over features on mobile screens
                        view.popup.dockOptions = {
                            buttonEnabled: false,
                            breakpoint: false,
                        };
                    } else {
                        // Initialize with control panel expanded on desktop screens
                        if (controlPanelExpand) {
                            controlPanelExpand.expanded = true;
                        }

                        // dock popups on desktop screens to the lower right corner
                        view.popup.dockEnabled = true;
                        view.popup.dockOptions = {
                            buttonEnabled: false,
                            breakpoint: false,
                            position: "bottom-right"
                        };
                    }
                },
                { initial: true }
            );

            // Initialize geolocation tracking
            setupLocationServices(view);
            
            // Priority click handler for overlapping features -- logic adapted from my midterm project
            view.on("click", (event) => {
                view.hitTest(event).then((response) => {
                    const graphics = response.results.filter(res => res.type === "graphic");
                    if (graphics.length === 0) return;

                    // Point features (whale/wildlife sightings, view points) prioritized over line features (ferry routes, stranding network) and polygons (action areas)
                    const layerOrder = [
                        "whalesLayer",
                        "wildlifeLayer",
                        "accessLayer",
                        "pwwaLayer",
                        "ferryLayer",
                        "strandingLayer",
                        "actionAreasLayer"
                    ];
                    
                    // Select highest priority feature hit by click
                    const selectedResult = graphics.find(res => layerOrder.includes(res.graphic.layer?.id));
                    if (!selectedResult) return;

                    const targetGraphic = selectedResult.graphic;

                    // Open popup for selected priority feature
                    view.popup.open({
                        features: [targetGraphic],
                        location: event.mapPoint
                    });

                    // Smooth zoom/centering transition based on geometry type
                    if (targetGraphic.geometry.type === "point") {
                        view.goTo({
                            target: targetGraphic.geometry
                        }, {
                            duration: 800,
                            easing: "ease-in-out"
                        });
                    } else {
                        view.goTo(
                            { target: targetGraphic.geometry }, 
                            {
                                duration: 1000, 
                                easing: "ease-in-out"
                            }
                        );
                    }
                });
            });
        });
    })

    .catch((err) => {
        console.error("Critical Failure: App bootstrapping aborted.", err); // Log any errors during map initialization
    });