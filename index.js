/**
 * Copyright (c) 2018 Philippe FERDINAND
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 **/
'use strict';

const log = require('winston');
const assign = require('object-assign');
const yaml = require('js-yaml');
const path = require('path');

function traverse(oas, raml, context) {

  const keys = Object.keys(oas);
  for (let i in keys) {
    const key = keys[i];
    const converter = context.converters[key];
    if (converter) {
      converter.call(null, key, oas[key], raml, context);
    }
    else {
      log.warn(`Skipping ${path.join(context.path, key)}: property not supported by the converter.`);
    }

  }

}

function copy(key, value, raml) {
  raml[key] = value;
}

function skip(key, value, raml, context) {
  log.warn(`Skipping ${path.join(context.path, key)}: not supported by RAML.`)
}

const converters = {

  openapi: (key, version) => {
    if (!version.match(/^3\./))
      log.error(`Ther version ${version} is not supported.`);
  },

  info: (key, info, raml, context) => {
    traverse(info, raml, assign({}, context, {
      path: "info",
      converters: {
        title: copy,
        description: copy,
        termsOfService: (key, termsOfService, raml) => {
          raml.documentation.push({
            title: "Terms of Service",
            content: `[Terms of Service](${termsOfService})`
          });
        },
        contact: skip,
        license: skip,
        version: copy
      }
    }));
  },

  servers: (key, servers, raml, context) => {

    if (servers.length > 1) {
      log.warn(`Partial convertion of ${path.join(context.path, key)}: RAML is limited to one server.`);
    }

    traverse(servers[0], raml, assign({}, context, {
      path: context.path + "servers[0]",
      converters: {
        url: (key, value, raml) => { raml.baseUri = value; },
        variables: (key, variables, raml) => {
          raml.baseUriParameters = {};
          let keys = Object.keys(variables);
          for (let i in keys) {
            let variable = variables[keys[i]];
            raml.baseUriParameters[keys[i]] = {};
            traverse(variable, raml.baseUriParameters[keys[i]], assign({}, context, {
              path: path.join(context.path, 'baseUriParameters', keys[i]),
              converters: {
                enum: copy,
                default: copy,
                description: copy
              }
            }));
          }


        }
      }
    }));
  },

  paths: (key, paths, raml, context) => {

    let operation = (method, operation, raml, context) => {

      raml[method] = {};
      traverse(operation, raml[method], assign({}, context, {
        path: path.join(context.path, method),
        parent: raml,
        converters: {

          /**
           * [string]	A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.
           */
          tags: skip,

          /**
          * string	A short summary of what the operation does.
          */
          summary: (key, value, raml) => {
            raml.displayName = value;
          },

          /**
           * string	A verbose explanation of the operation behavior. CommonMark syntax MAY be used for rich text representation.
           */
          description: copy,

          /**
          * External Documentation Object	Additional external documentation for this operation.
          */
          externalDocs: skip,

          /**
           * string	Unique string used to identify the operation. The id MUST be unique among all operations described in the API. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.
           */
          operationId: skip,

          /**
           * parameters	[Parameter Object | Reference Object]	A list of parameters that are applicable for this operation. If a parameter is already defined at the Path Item, the new definition will override it but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. The list can use the Reference Object to link to parameters that are defined at the OpenAPI Object's components/parameters.
           */
          parameters: (name, parameters, raml, context) => {

            for (let i in parameters) {

              let parameter = parameters[i];
              if (parameter.$ref) {
                // replace by the reference
              }

              let ramlParameter = {};
              switch (parameter.in) {

                case 'query':
                  (raml.queryParameters = (raml.queryParameters || {}))[parameter.name] = ramlParameter;
                  break;

                case 'header':
                (raml.headers = (raml.headers || {}))[parameter.name] = ramlParameter;
                break;

                case 'path':
                // (context.parent.headers = (raml.headers || {}))[parameter.name] = ramlParameter;
                break;

                case 'cookie':
                  break;

              }

            }






          },

          /**
           * Request Body Object | Reference Object	The request body applicable for this operation. The requestBody is only supported in HTTP methods where the HTTP 1.1 specification RFC7231 has explicitly defined semantics for request bodies. In other cases where the HTTP spec is vague, requestBody SHALL be ignored by consumers.
           */
          requestBody: skip,

          /**
          * responses	Responses Object	REQUIRED. The list of possible responses as they are returned from executing this operation.
          */
          responses: skip,

          /**
           * callbacks	Map[string, Callback Object | Reference Object]	A map of possible out-of band callbacks related to the parent operation. The key is a unique identifier for the Callback Object. Each value in the map is a Callback Object that describes a request that may be initiated by the API provider and the expected responses. The key value used to identify the callback object is an expression, evaluated at runtime, that identifies a URL to use for the callback operation.
           */

          /**
           * boolean	Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation. Default value is false.
           */
          deprecated: skip,

          /**
           * [Security Requirement Object]	A declaration of which security mechanisms can be used for this operation. The list of values includes alternative security requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request. This definition overrides any declared top-level security. To remove a top-level security declaration, an empty array can be used.
           */
          security: skip,

          /**
           * servers	[Server Object]	An alternative server array to service this operation. If an alternative server object is specified at the Path Item Object or Root level, it will be overridden by this value.
           */
          servers: skip

        }
      }));

      if (!raml[method].displayName && context.summary) {
        raml[method].displayName = context.summary;
      }

      if (!raml[method].description && context.description) {
        raml[method].description = context.description;
      }

    };

    let keys = Object.keys(paths);
    for (let i in keys) {
      let resource = keys[i];
      let object = paths[resource];
      raml[resource] = {};
      traverse(paths[resource], raml[resource], assign({}, context, {
        path: path.join(context.path, resource),
        converters: {

          /**
           * Allows for an external definition of this path item.
           */
          $ref: skip,

          /**
           * An optional, string summary, intended to apply to all operations in this path.
           */
          summary: (key, summary, raml, context) => {
            context.summary = summary;
          },

          /**
           * An optional, string description, intended to apply to all operations in this path.
           */
          description: (key, description, raml, context) => {
            context.description = description;
          },

          /**
           * A definition of a GET operation on this path.
           */
          get: operation,

          /**
           * A definition of a PUT operation on this path.
           */
          put: operation,

          /**
           * A definition of a POST operation on this path.
           */
          post: operation,

          /**
           * A definition of a DELETE operation on this path.
           */
          delete: operation,

          /**
           * A definition of a OPTIONS operation on this path.
           */
          options: operation,

          /**
           * A definition of a HEAD operation on this path.
           */
          head: operation,

          /**
           * A definition of a PATCH operation on this path.
           */
          patch: operation,

          /**
           * A definition of a TRACE operation on this path.
           */
          trace: skip,

          /**
           * An alternative server array to service all operations in this path.
           */
          servers: skip,

          /**
           * A list of parameters that are applicable for all the operations described under this path.
           */
          parameters: skip
        }
      }));
    }

  }

}

module.exports = {

  convert: function (oas, options) {

    const context = {
      path: '',
      output: {},
      converters: converters
    };

    traverse(oas, context.output, context);
    return "#%RAML 1.0\n" + yaml.dump(context.output);

  }


};
