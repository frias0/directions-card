/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
} from 'lit';
import { customElement, property, state } from "lit/decorators";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers


import './editor';

import type { DirectionsCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { Loader } from "@googlemaps/js-api-loader";

/* eslint no-console: 0 */
console.info(
  `%c  DIRECTIONS-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'directions-card',
  name: 'Google maps directions Card',
  description: 'A template custom card for you to create something awesome',
});

// TODO Name your custom element
@customElement('directions-card')
export class DirectionsCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('directions-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: DirectionsCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: DirectionsCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Boilerplate',
      ...config,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }
    console.log(this.config.api_key);
    return html`
      <ha-card
        .header=${this.config.name}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Boilerplate: ${this.config.entity || 'No Entity Defined'}`}
      ><div id="map" class="map"></div></ha-card>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initMap();
  }

  private initMap() {
    console.log()
    const api_key = this.config.api_key;
    const loader = new Loader({
      apiKey: api_key,
      version: "weekly"
    });
    loader.load().then((google) => {
      const rendererOptions: google.maps.DirectionsRendererOptions = {
        suppressMarkers: false,
        hideRouteList: false,
    

      }
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions);
      const div = this.shadowRoot?.querySelector("#map") as HTMLElement;
      const map = new google.maps.Map(div);
      const options: google.maps.MapOptions = {
        disableDefaultUI: true
      };
      map.setOptions(options);
    
      directionsRenderer.setMap(map);
      console.log(map)
      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(map);

      const drivingOptions: google.maps.DrivingOptions = {
        departureTime: new Date(),
      }
      const request: google.maps.DirectionsRequest = {
        origin: this.config.start,
        destination: this.config.end,
        provideRouteAlternatives: true,
        drivingOptions: drivingOptions,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      };
      directionsService.route(request, function(result, status) {
        if (status == 'OK') {
          console.log(result)
          directionsRenderer.setDirections(result);
        }
      });
      

      div.style.height=this.offsetWidth+"px";
      div.style.width=this.offsetWidth+"px";
      console.log(""+this.offsetWidth);
      console.log(this)

    })

  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css``;
  }
}
