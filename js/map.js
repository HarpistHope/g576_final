// map.js manages map layer loading and configurations 
export function initMap(viewContainerId, apiKey) {
    return new Promise((resolve, reject) => {
        require([           // Start by calling all the necessary esri layers 
            "esri/config", 
            "esri/Map", 
            "esri/views/MapView",  
            "esri/layers/FeatureLayer",
            "esri/widgets/Legend",
            "esri/widgets/Expand",
            "esri/widgets/Zoom",
            "esri/widgets/Editor"
        ], (esriConfig, Map, MapView, FeatureLayer, Legend, Expand, Zoom, Editor) => {
            
            // I've wrapped the script in a try/catch statement to help monitor for/catch errors
            try {

                // defined in main.js
                esriConfig.apiKey = apiKey; 

                // Esri’s World Ocean Basemap attribution: Esri, GEBCO, NOAA, Garmin, and other contributors
                const map = new Map({
                    basemap: "arcgis-oceans"
                });

                // Construct the map view 
                const view = new MapView({
                    container: viewContainerId,
                    map: map,
                    center: [-122.95, 48.15], // approximate center of Puget Sound, WA
                    zoom: 8,

                    // Restrict zoom limits 
                    constraints: {
                        minZoom: 6,
                    },

                    // Same as my midterm, I've manually removed the default widgets (except for attributions) so I can re-add the zoom widget in a specific index position
                    ui: {
                       components: ["attribution"]
                    }

                }); // end of view setup

                // Popup templates

                // Shoreline Public Access popup template
                const accessPopup = {
                    title: "Shoreline Access: {Beach_Name}",
                    content: [{
                        type: "text",
                        text: `
                            <div class="popup-container">
                                <div class="popup-section">
                                <span class="popup-label">Location:</span> {City_NM}, {County_NM} County ({Region_NM} Region)
                                </div>
                                
                                <div class="popup-section">
                                    <h4 class="popup-heading">Site Logistics & Fees</h4>
                                    <ul>
                                        <li><span class="popup-label">Access Type:</span> {Primary_Acccess_Type}</li>
                                        <li><span class="popup-label">Entry Fee:</span> {Access_Fee}</li>
                                        <li><span class="popup-label">Parking:</span> {Parking} (Fee: {Parking_Fee})</li>
                                        <li><span class="popup-label">Amenities:</span> Restrooms: {Restrooms} | Drinking Water: {Drinking_Water}</li>
                                        <li><span class="popup-label">Accessibility:</span> {Primary_ADA_Features}</li>
                                    </ul>
                                </div>

                                <div class="popup-links">
                                    <span class="popup-heading">Live Conditions:</span>
                                    <a href="{Weather_Link}" target="_blank" class="popup-link-btn">Local Weather</a>
                                    <span class="popup-spacer">|</span>
                                    <a href="{Tide_Link}" target="_blank" class="popup-link-btn">Tide Chart</a>
                                </div>
                            </div>`
                        }]
                    };

                // PWWA Members Popup template
                const pwwaPopup = {
                    title: "PWWA Member: {Company_Name}",
                    content: [{
                        type: "text",
                        text: `
                            <div class="popup-container">
                                <div class="popup-section">
                                    <span class="popup-label">Association:</span> Pacific Whale Watch Association (PWWA) Member
                                </div>
                                
                                <div class="popup-section">
                                    <h4 class="popup-heading">Contact & Location</h4>
                                    <ul>
                                        <li><span class="popup-label">Address:</span> {Street_Address}, {City}, {State_Province} {Zip_Postal}</li>
                                        <li><span class="popup-label">Phone:</span> <a href="tel:{Phone}" class="popup-link-accent">{Phone}</a></li>
                                        <li><span class="popup-label">Website:</span> <a href="https://{Website_URL}" target="_blank" rel="noopener noreferrer" class="popup-link-accent">Visit Official Website ↗</a></li>
                                    </ul>
                                </div>
                                
                                <hr class="popup-divider-dashed">
                                <p class="popup-metadata">
                                    <span class="popup-label">Metadata Note:</span> Operator directory manually compiled from public registry data by H. McBride. Hosted as a georeferenced feature layer.
                                </p>
                            </div>`
                    }]
                };

                // Marine Mammal Stranding Network popup template
                const strandingPopup = {
                    title: "Stranding Response Zone: {LiveOrg}",
                    // Gemini helped me write this Arcade expression to clean up the network phone numbers and turn them into clickable links
                    expressionInfos: [{
                        name: "emergency-dial-link",
                        title: "Clean Phone Protocol",
                        expression: `
                            if (IsEmpty($feature.LivePhone)) { return ''; }
                            var allowed = "0123456789";
                            var cleanNum = "";
                            for (var i = 0; i < Count($feature.LivePhone); i++) {
                                var char = Mid($feature.LivePhone, i, 1);
                                if (Find(char, allowed) > -1) { cleanNum += char; }
                            }
                            return 'tel:' + cleanNum;
                        `
                    }],
                    // Along with the feature layer fields, I've included a little custom alert about stranded marine mammal safety
                    content: [{
                        type: "text",
                        text: `
                            <div class="popup-container">
                                <div class="popup-alert-box">
                                    <strong>⚠️ FOR LIVE OR STRANDED MARINE MAMMALS:</strong><br>
                                    Please report encounters immediately to the regional coordinator listed below. Do not attempt to move or touch the animal.
                                </div>
                                
                                <div class="popup-section">
                                    <span class="popup-label">Authorized Agency:</span> {LiveOrg}<br>
                                    <span class="popup-label">Regional Hotline:</span> 
                                    <a href="{expression/emergency-dial-link}" class="popup-hotline-link">{LivePhone}</a>
                                </div>
                                
                                <hr class="popup-divider-solid">
                                <p class="popup-metadata-block">
                                    <span class="popup-label">Data Source:</span> NOAA Fisheries West Coast Region & U.S. Fish and Wildlife Service.<br>
                                    <i>Jurisdiction boundaries represent official response networks for reporting injured, entangled, or stranded marine mammals.</i>
                                </p>
                            </div>
                        `
                    }]
                };

                // Whales Popup Template
                const whalesPopup = {
                    title: "Crowdsourced Whale Sighting",
                    fieldInfos: [{
                        fieldName: "date_time",
                        format: {
                            dateFormat: "long-date" // formats to "July 19, 2026"
                        }
                    }],
                    // Another Gemini-assisted Arcade expression, cleans up the optional 'other relevant details' section from the whale sighting survey
                    expressionInfos: [{
                        name: "safe-description",
                        expression: "if(IsEmpty($feature.other_relevant_details)) { return 'No additional details provided.'; } return $feature.other_relevant_details;"
                    }],
                    content: [{
                        type: "text",
                        text: `
                            <div class="popup-crowdsourced-content">
                                <table class="esri-widget__table popup-table layout-fixed">
                                    <tr>
                                        <th>Sighting Date:</th>
                                        <td class="text-bold text-alert">{date_time}</td>
                                    </tr>
                                    <tr>
                                        <th>Whale Species:</th>
                                        <td>{species}</td>
                                    </tr>
                                    <tr>
                                        <th>Number Seen:</th>
                                        <td>{number_of_whales}</td>
                                    </tr>
                                </table>
                                
                                <h4 class="popup-section-title">Observer Notes</h4>
                                <p class="popup-text-main">{expression/safe-description}</p>
                                
                                <div class="popup-attribution">Reported by: Observer Community Contribution</div>
                            </div>
                        `
                    }]
                };

                // Wildlife sightings popup template
                const wildlifePopup = {
                    title: "Crowdsourced Wildlife Sighting",
                    fieldInfos: [{
                        fieldName: "_date",
                        format: {
                            dateFormat: "long-date"
                        }
                    }],
                    // Similar Arcade expression as used in the whales popup, cleans the optional 'details' section from the wildlife survey
                    expressionInfos: [{
                        name: "safe-description",
                        expression: "if(IsEmpty($feature.details)) { return 'No additional details provided.'; } return $feature.details;"
                    }],
                    content: [{
                        type: "text",
                        text: `
                            <div class="popup-crowdsourced-content">
                                <table class="esri-widget__table popup-table layout-fixed">
                                    <tr>
                                        <th>Sighting Date:</th>
                                        <td class="text-bold text-alert">{_date}</td>
                                    </tr>
                                    <tr>
                                        <th>Species:</th>
                                        <td>{species}</td>
                                    </tr>
                                    <tr>
                                        <th>Count:</th>
                                        <td>{_count}</td>
                                    </tr>
                                </table>
                                
                                <h4 class="popup-section-title">Observer Notes</h4>
                                <p class="popup-text-main">{expression/safe-description}</p>
                                
                                <div class="popup-attribution">Reported by: Observer Community Contribution</div>
                            </div>
                        `
                    }]
                };


                // Custom renderers configurations

                // customize whales renderer/icon (original orca icon attribution: Orca by Salman Azzumardi from Noun Project (CC BY 3.0) -- edited on Canva by Hope McBride)
                const whalesRenderer = {
                    type: "simple",
                    symbol: { type: "picture-marker", url: "images/big_orca_canva_nounproject.png", width: "22px", height: "22px" }
                };

                // customize wildlife renderer/icon (sea otter icon attribution: sea otter by bis kim from Noun Project (CC BY 3.0) --- edited by Hope McBride on Canva)
                const wildlifeRenderer = {
                    type: "simple",
                    symbol: { type: "picture-marker", url: "images/seaotter_canva_nounproject.png", width: "22px", height: "22px" }
                }; 

                // customize access points renderer/icon (binoculars icon attribution: Binoculars by Lakshisha from Noun Project (CC BY 3.0) --- edited by Hope McBride on Canva)
                const accessRenderer = {
                    type: "simple",
                    symbol: { type: "picture-marker", url: "images/binoculars_canva_nounproject.png", width: "22px", height: "22px" }
                }; 
                
                // customize pwwa members renderer/icon (boat wheel icon attribution: ship steering wheel by Creative Stall from Noun Project (CC BY 3.0)  --- edited by Hope McBride on Canva)
                const pwwaRenderer = {
                    type: "simple",
                    symbol: { type: "picture-marker", url: "images/boatwheel_nounproject_canva.png", width: "22px", height: "22px" }
                }; 

                // customize stranding network renderer (the original layer was a fine, grey line, difficult for users to notice)
                const strandingRenderer = {
                    type: "simple",
                    symbol: {
                        type: "simple-line",
                        color: "#FFC067", 
                        width: "2px",
                        style: "solid"
                    }
                };


                // Initialize/load the feature layers

                // WAPSP Action Areas layer attribution: Washington State Puget Sound Partnership 
                const actionAreasLayer = new FeatureLayer({ 
                    url: "https://services7.arcgis.com/iAd79FjHxHKsLP0y/arcgis/rest/services/WAPSP_Action_Areas/FeatureServer",
                    title: "Puget Sound Partnership Action Areas", // I added titles to all the layers so the legend is more easily human-readable
                    opacity: 0.6, // I toned down the opacity so the action areas don't overwhelm the view 
                    visible: false, // I turned off initial visibility for all layers so users are not overwhelmed and can select the layers relevant to their own needs
                });
                map.add(actionAreasLayer);

                // NOAA West Coast Marine Mammal Stranding Network layer attribution: NOAA Fisheries West Coast Region; U.S. Fish and Wildlife Service, Division of Realty and Refuge Information 
                const strandingLayer = new FeatureLayer({ 
                    url: "https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/Live_Marine_Mammal_Stranding_Network_Live/FeatureServer",
                    popupTemplate: strandingPopup,
                    renderer: strandingRenderer,
                    title: "NOAA West Coast Marine Mammal Stranding Network",
                    opacity: 0.8,
                    visible: false,
                });
                map.add(strandingLayer);

                // Shoreline Public Access Points layer attribution: Washington State Department of Ecology, Shorelands and Environmental Assistance Program 
                const accessLayer = new FeatureLayer({
                    url: "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/PublicBeachAccess_Points_ViewPointTrue_PgtSnd_Rural/FeatureServer",
                    renderer: accessRenderer,
                    popupTemplate: accessPopup,
                    title: "Shoreline Public Access Rural View Points",
                    visible: false,
                });
                map.add(accessLayer); 

                // WSDOT Ferry Routes layer attribution: Washington State Department of Transportation 
                const ferryLayer = new FeatureLayer({
                    url: "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/FerryRoutes/MapServer/1", 
                    title: "Washington State Ferry Routes",
                    visible: false,
                });
                    map.add(ferryLayer);

                // PWWA Members layer attribution: Member information table manually compiled by H. McBride from data available at https://www.pacificwhalewatchassociation.com/members, converted to CSV, hosted on AGOL as a georeferenced feature layer.
                const pwwaLayer = new FeatureLayer({
                    url: "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/pacific_whale_watch_association_members/FeatureServer",
                    popupTemplate: pwwaPopup,
                    renderer: pwwaRenderer,
                    outfields: ["*"], // Ensures all fields are available for popup and filtering
                    title: "Pacific Whale Watch Association Whale Watching Tour Companies",
                    visible: false,
                    });
                map.add(pwwaLayer);

                // Crowdsourced Whale Sightings layer attribution: User-Generated from Survey123 results, created/hosted by hkmcbride@wisc.edu (H. McBride) on ArcGIS Online
                const whalesLayer = new FeatureLayer({
                    url: "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/survey123_7ea959f0dc7e41cca7afa3a2b4e6cd63_results/FeatureServer",
                    popupTemplate: whalesPopup,
                    renderer: whalesRenderer,
                    title: "Crowdsourced Whale Sightings",
                    refreshInterval: 0.05, // I used a low refresh interval (every five seconds) so Survey results are added directly to the map without users needing to refresh the browser
                    visible: false,
                    });
                map.add(whalesLayer);

                // Crowdsourced wildlife Sightings layer attribution: User-Generated from Survey123 results, created/hosted by hkmcbride@wisc.edu (H. McBride) on ArcGIS Online
                const wildlifeLayer = new FeatureLayer({
                    url: "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/survey123_3afb8b1d28264a8ca054fae92a591ba7_results/FeatureServer",
                    popupTemplate: wildlifePopup,
                    renderer: wildlifeRenderer,
                    title: "Crowdsourced Wildlife Sightings",
                    refreshInterval: 0.05, // same low refresh interval added as above
                    visible: false,
                    });
                map.add(wildlifeLayer);

                // Add the action bar (containing the Add Whale and Add Wildlife buttons) to the top-right corner of the view
                view.ui.add("actionBar", "top-right");

                // Main Control Panel (Includes layer visibility toggles and filters)

                //Create a container for the unified control panel - styled in style.css
                const controlPanelContainer = document.createElement("div");
                controlPanelContainer.classList.add("control-panel-container");


                // add toggles and filters to the control panel, all toggles are unchecked initially
                controlPanelContainer.innerHTML = `
                    <h3 class="panel-main-title">Map Controls</h3>
                    <div class="panel-section-group">
                        <span class="panel-section-title">Whales and Wildlife</span>
                        <label><input type="checkbox" id="toggleWhales"> Whale Sightings</label>
                        <label><input type="checkbox" id="toggleWildlife"> Wildlife Sightings</label>
                        <span class="panel-section-title">Observation Aids</span>
                        <label><input type="checkbox" id="toggleAccess"> Rural Public Access View Points</label>
                        <label><input type="checkbox" id="toggleFerry"> WSDOT Ferry Routes</label>
                        <label><input type="checkbox" id="togglePwwa"> Whale Watching Tours</label>
                        <span class="panel-section-title">Environmental Stewardship</span>
                        <label><input type="checkbox" id="toggleAction"> Puget Sound Partnership Action Areas</label>
                        <label><input type="checkbox" id="toggleStranding"> Marine Mammal Stranding Network</label>
                    </div>
                    <div class="panel-section-group dynamic-filters">
                        <span class="panel-section-title">Filter Features</span>
                        <div class="filter-input-wrapper">
                            <label for="panelWhaleFilter">Filter by Whale Type:</label>
                            <select id="panelWhaleFilter">
                                <option value="all">Show All Whale Sightings</option>
                            </select>
                        </div>
                        <div class="filter-input-wrapper">
                            <label for="panelWildlifeFilter">Filter by Wildlife Type:</label>
                            <select id="panelWildlifeFilter">
                                <option value="all">Show All Wildlife Sightings</option>
                            </select>
                        </div>
                        <div class="filter-input-wrapper">
                            <label for="panelActionFilter">Filter All Features by Action Area:</label>
                            <select id="panelActionFilter">
                                <option value="all">Show All Features</option>
                            </select>
                        </div>
                    </div>
                `;

                // place the control panel within an expand (this is collapsed on mobile screens using reactiveUtils in main.js)
                const controlPanelExpand = new Expand({
                    view: view,
                    content: controlPanelContainer,
                    expandIconClass: "custom-control-panel-icon", // custom icon defined in style.css (Control Panel Icon attribution: control panel by sugeng riyanto from Noun Project (CC BY 3.0))
                    expandTooltip: "Open Map Controls",
                    expanded: false,
                    mode: "floating",
                    id: "controlPanelExpand", // assigned an id to help screen responsive managment 
                    group: "widgets", // I've grouped all the expand widgets (control, legend, editor) together so only one can be open at a time
                });
                view.ui.add(controlPanelExpand, "top-left");

                //Gemini helped me write the following function to dynamically populate the species dropdowns so I don't have to manually update things if I add new species to the surveys in the future
                // Helper function to read Survey123 field domains and build dropdown options
                function populateDropdownFromDomain(layer, selectElementId) {
                    layer.when(() => {
                        const speciesField = layer.fields.find(f => f.name === "species");
                        const selectDropdown = controlPanelContainer.querySelector(`#${selectElementId}`);
                        
                        if (speciesField && speciesField.domain && selectDropdown) {
                            speciesField.domain.codedValues.forEach(cv => {
                                const option = document.createElement("option");
                                option.value = cv.code;  // e.g., "Orca"
                                option.text = cv.name;   // e.g., "Orca"
                                selectDropdown.appendChild(option);
                            });
                        }
                    });
                }

                // Populate species dropdowns dynamically from Coded Value Domains
                populateDropdownFromDomain(whalesLayer, "panelWhaleFilter");
                populateDropdownFromDomain(wildlifeLayer, "panelWildlifeFilter");

                // Event listeners for control panel toggles and filters - Gemini helped me workshop the details of the following functions
                // Attach visibility toggles
                const visibilityConfigs = [
                    { id: "toggleWhales", layer: whalesLayer },
                    { id: "toggleWildlife", layer: wildlifeLayer },
                    { id: "toggleAccess", layer: accessLayer },
                    { id: "toggleFerry", layer: ferryLayer },
                    { id: "togglePwwa", layer: pwwaLayer },
                    { id: "toggleAction", layer: actionAreasLayer },
                    { id: "toggleStranding", layer: strandingLayer }
                ];
                visibilityConfigs.forEach(config => {
                    const checkbox = controlPanelContainer.querySelector(`#${config.id}`);
                    if (checkbox) {
                        checkbox.addEventListener("change", (e) => {
                            config.layer.visible = e.target.checked;
                        });
                    }
                });

                // Attach attribute definition expressions
                const whaleFilterSelect = controlPanelContainer.querySelector("#panelWhaleFilter");
                if (whaleFilterSelect) {
                    whaleFilterSelect.addEventListener("change", (e) => {
                        const selectedValue = e.target.value;
                        whalesLayer.definitionExpression = selectedValue === "all" ? null : `species = '${selectedValue}'`;
                    });
                }

                const wildlifeFilterSelect = controlPanelContainer.querySelector("#panelWildlifeFilter");
                if (wildlifeFilterSelect) {
                    wildlifeFilterSelect.addEventListener("change", (e) => {
                        const selectedValue = e.target.value;
                        wildlifeLayer.definitionExpression = selectedValue === "all" ? null : `species = '${selectedValue}'`;
                    });
                }

                // The featureLayer.createQuery() function achieves my stretch goal of using a spatial query on the Action Area layers to filter all other feature layer results. 
                // Gemini assisted with function design and troubleshooting
                //  Dynamic population for action areas boundary dropdown (Deduplicated & Sorted)
                actionAreasLayer.when(() => {
                    const query = actionAreasLayer.createQuery();
                    query.where = "1=1"; // Explicitly specify where clause
                    query.outFields = ["ActionArea"];
                    query.returnGeometry = false;
                    query.returnDistinctValues = true; // Asks server to return distinct values

                    actionAreasLayer.queryFeatures(query).then((results) => {
                        const actionSelect = controlPanelContainer.querySelector("#panelActionFilter");
                        if (actionSelect) {
                            const names = [...new Set(results.features.map(f => f.attributes.ActionArea).filter(Boolean))];
                            names.sort().forEach((name) => {
                                const option = document.createElement("option");
                                option.value = name;
                                option.text = name;
                                actionSelect.appendChild(option);
                            });
                        }
                    }).catch(err => {
                        console.error("Failed to query Action Areas for dropdown:", err);
                    });
                });


                // Spatial intersection and action area visibility filtering
                const actionSelect = controlPanelContainer.querySelector("#panelActionFilter");

                if (actionSelect) {
                    actionSelect.addEventListener("change", async (e) => {
                        const selectedAreaName = e.target.value;

                        // create layer views for each layer to apply client-side visual filters
                        const whalesLayerView = await view.whenLayerView(whalesLayer);
                        const wildlifeLayerView = await view.whenLayerView(wildlifeLayer);
                        const accessLayerView = await view.whenLayerView(accessLayer);
                        const pwwaLayerView = await view.whenLayerView(pwwaLayer);
                        const strandingLayerView = await view.whenLayerView(strandingLayer);
                        const ferryLayerView = await view.whenLayerView(ferryLayer);

                        const pointLayerViews = [whalesLayerView, wildlifeLayerView, accessLayerView, pwwaLayerView, strandingLayerView, ferryLayerView];

                        // Reset back to "Show All"
                        if (selectedAreaName === "all") {
                            // Reset polygon boundary layer visibility
                            actionAreasLayer.definitionExpression = null;

                            // Reset spatial filter on point layers
                            pointLayerViews.forEach(lv => {
                                if (lv) lv.filter = null;
                            });
                            return;
                        }

                        // Filter Action Areas polygon layer to only display the selected area
                        actionAreasLayer.definitionExpression = `ActionArea = '${selectedAreaName}'`;

                        // Query the geom of the selected action area polygon
                        const boundaryQuery = actionAreasLayer.createQuery();
                        boundaryQuery.where = `ActionArea = '${selectedAreaName}'`;
                        boundaryQuery.returnGeometry = true;

                        try {
                            const boundaryResult = await actionAreasLayer.queryFeatures(boundaryQuery);

                            if (boundaryResult.features.length > 0) {
                                // Union geometries if multiple polygon parts exist for this area
                                const geometries = boundaryResult.features.map(f => f.geometry);
                                const targetGeometry = geometries.length === 1 ? geometries[0] : geometries;

                                const spatialFilter = {
                                    geometry: targetGeometry,
                                    spatialRelationship: "intersects" // 'intersects' handles points right on boundary edges cleanly
                                };

                                pointLayerViews.forEach(lv => {
                                    if (lv) lv.filter = spatialFilter;
                                });
                            }
                        } catch (err) {
                            console.error("Spatial filter query failed:", err);
                        }
                    });
                }

                // Add zoom, legend, editor widgets

                // Zoom Widget
                const zoomWidget = new Zoom({
                    view: view,
                    index: 1 // below the control panel
                });
                view.ui.add(zoomWidget, "top-left");

                // Legend Widget
                const legendWidget = new Legend({
                    view: view,
                });

                const legendExpand = new Expand({
                    view: view,
                    content: legendWidget,
                    expandIconClass: "esri-icon-legend", 
                    expandTooltip: "Show Map Legend", 
                    mode: "floating",
                    group: "widgets", 
                    index: 2
                });
                view.ui.add(legendExpand, "top-left");

                // Editor Widget
                const editorWidget = new Editor({
                    view: view,
                    layerInfos: [
                        whalesLayer,
                        wildlifeLayer
                    ]
                });

                const editorExpand = new Expand({
                    view: view,
                    content: editorWidget,
                    expandIconClass: "esri-icon-edit", 
                    expandTooltip: "Edit Crowdsourced Data",
                    group: "widgets",
                    mode: "floating",
                    id: "editorExpand",
                    index: 3
                });
                view.ui.add(editorExpand, "top-left");

                // Runtime error tracking - adapted from my midterm project
                actionAreasLayer.load().catch(err => console.error("Runtime Error: WAPSP Action Areas layer failed", err));
                strandingLayer.load().catch(err => console.error("Runtime Error: Stranding Network layer failed", err));
                accessLayer.load().catch(err => console.error("Runtime Error: Public Access layer failed", err));
                ferryLayer.load().catch(err => console.error("Runtime Error: WSDOT Ferry layer failed", err));
                pwwaLayer.load().catch(err => console.error("Runtime Error: PWWA Members layer failed", err));
                whalesLayer.load().catch(err => console.error("Runtime Error: Whale Sightings layer failed", err));
                wildlifeLayer.load().catch(err => console.error("Runtime Error: Wildlife Sightings layer failed", err));

    resolve(view);
                } catch (error) { 
                    reject(error); 
            }
        });
    });
}
