const MongoClient = require('mongodb').MongoClient

const _request_method = params.request_method
const _request_parameter = params.request_parameter

async function orderIntegratedUpdate() {

    const _parameters = event.body
    const _to_update = {
        vanrooy: {}
    }

    _to_update.vanrooy.integrated_at = new Date()

    if (_parameters.Erro) {
        _to_update.vanrooy.erro = _parameters.Erro
    }

    if (_parameters.NumeroPedidoCRM) {
        _to_update.vanrooy.numeroPedidoCRM = _parameters.NumeroPedidoCRM
        _to_update.vanrooy.status = true
    }

    if (_parameters.ChaveNFE) {
        _to_update.vanrooy.chaveNFE = _parameters.ChaveNFE
    }

    if (_parameters.NrRastreamento) {
        _to_update.vanrooy.nrRastreamento = _parameters.NrRastreamento
    }

    if (_parameters.CdStatusEntrega) {
        _to_update.vanrooy.cdStatusEntrega = _parameters.CdStatusEntrega
    }

    if (_parameters.ObsStatusEntrega) {
        _to_update.vanrooy.obsStatusEntrega = _parameters.ObsStatusEntrega
    }

    const config = {
        method: "GET",
        // url: `http://177.141.113.181:30000/api/Pedido/${_parameters.NumeroPedidoCRM}`,
        url: `http://${process.env.vanrooy_ip}:30000/api/Pedido/${_parameters.NumeroPedidoCRM}`,
        // params: params.query,
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*"
        },
        // responseType: params.responseType,
        // data: params.data,
    }
    config.auth = {
        username: "apialobela",
        password: "sMNY7t5bOMpQrzZ"
    }

    this.vanRooyResult = await require("@pipedreamhq/platform").axios(this, config)

    const _updateData = {
        $set: {
            "integrations.0": _to_update,
            "data.vanrooy": this.vanRooyResult.Pedido
        }
    }
    const _query = { "platform_id": parseInt(_request_parameter) }

    await mongoUpdateOne(_query, _updateData)

    return {
        status: 201,
        headers: { "Content-Type": 'application/json' },
        body: { Erro: null }
    }
}

function isSaoPauloState(zipcode) {
    if (zipcode >= 1000000 && zipcode <= 19999999) {
        return true
    }
    return false
}

function _getDeliveryProvider(zipcode, value) {
    const _zipnumber = parseInt(zipcode)

    if (
        (_zipnumber >= 1000000 && _zipnumber <= 4829999) ||
        (_zipnumber >= 7000000 && _zipnumber <= 7399999) ||
        (_zipnumber >= 8000000 && _zipnumber <= 8499999) ||
        (_zipnumber >= 9510005 && _zipnumber <= 9581900) ||
        (_zipnumber >= 9600000 && _zipnumber <= 9899999) ||
        (_zipnumber >= 6700001 && _zipnumber <= 6849999) ||
        (_zipnumber >= 5700000 && _zipnumber <= 5799999) ||
        (_zipnumber >= 9000000 && _zipnumber <= 9399999) ||
        (_zipnumber >= 8570001 && _zipnumber <= 8599999) ||
        (_zipnumber >= 9900001 && _zipnumber <= 9999999) ||
        (_zipnumber >= 5000000 && _zipnumber <= 5199999) ||
        (_zipnumber >= 5300000 && _zipnumber <= 5599999) ||
        (_zipnumber >= 6000001 && _zipnumber <= 6299999) ||
        (_zipnumber >= 6400001 && _zipnumber <= 6499999)
    ) {
        return {
            "type": "FC",
            "provider": "000007",
            "price": value
        }
    }
}

function maladiretaType(zipcode) {
    const _zipnumber = zipcode
    if (_zipnumber <= 9999999) {
        return {
            "type": "ML",
            "provider": "000008",
            "obs": "FECHAMENTO AUTORIZADO - PODE SER ABERTO PELA ECT"
        }
    }

    if (_zipnumber <= 19999999) {
        return {
            "type": "ME",
            "provider": "000008",
            "obs": "FECHAMENTO AUTORIZADO - PODE SER ABERTO PELA ECT"
        }
    }

    return {
        "type": "MN",
        "provider": "000008",
        "obs": "FECHAMENTO AUTORIZADO - PODE SER ABERTO PELA ECT"
    }
}

function _buildEntregaGuru(guruBody) {
    const product_id = guruBody.product.id
    const zipcode = guruBody.contact.address_zip_code
    const total_value = guruBody.payment.total
    const zipCodeInt = parseInt(zipcode)

    switch (product_id) {
        case "PRODUTOS QUE CONTEM AMOSTRA":
            //switch to get the CEP range and return the correct type
            const _malaDiretaType = maladiretaType(zipcode)
            _malaDiretaType["price"] = guruBody.shipment.value - 1
            return _malaDiretaType
        default:
            const _motoboyDelivery = _getDeliveryProvider(zipcode, guruBody.shipment.value)
            if (_motoboyDelivery) {
                return _motoboyDelivery
            }
            switch (guruBody.shipment.service) {
                case "SEDEX":
                    return {
                        "type": "SN",
                        "provider": "000000",
                        "price": guruBody.shipment.value
                    }
                case "PAC":
                    return {
                        "type": "PC",
                        "provider": "000000",
                        "price": guruBody.shipment.value
                    }
                default:
                    if (isSaoPauloState(zipCodeInt)) {
                        return {
                            "type": "SN",
                            "provider": "000000",
                            "price": guruBody.shipment.value
                        }
                    } else {
                        return {
                            "type": "PC",
                            "provider": "000000",
                            "price": guruBody.shipment.value
                        }
                    }
            }

    }
}

function _buildEntrega(yampiBody) {
    const sku = yampiBody.resource.items.data[0].sku.data.sku
    const zipcode = yampiBody.resource.shipping_address.data.zip_code
    const total_value = yampiBody.resource.value_total
    const zipCodeInt = parseInt(zipcode)


    switch (sku) {
        case "kitrevolution-amostra":
            //switch to get the CEP range and return the correct type
            const _malaDiretaType = maladiretaType(zipcode)
            _malaDiretaType["price"] = yampiBody.resource.value_shipment - 1
            return _malaDiretaType
        case "kitrevolution-15d":
        default:
            const _motoboyDelivery = _getDeliveryProvider(zipcode, yampiBody.resource.value_shipment)
            if (_motoboyDelivery) {
                return _motoboyDelivery
            }
            switch (yampiBody.resource.shipment_service_id) {
                case "04014":
                case "3220":
                    return {
                        "type": "SN",
                        "provider": "000000",
                        "price": yampiBody.resource.value_shipment
                    }
                case "04510":
                    return {
                        "type": "PC",
                        "provider": "000000",
                        "price": yampiBody.resource.value_shipment
                    }
                default:
                    if (isSaoPauloState(zipCodeInt)) {
                        return {
                            "type": "SN",
                            "provider": "000000",
                            "price": yampiBody.resource.value_shipment
                        }
                    } else {
                        return {
                            "type": "PC",
                            "provider": "000000",
                            "price": yampiBody.resource.value_shipment
                        }
                    }
            }

    }
}

function _buildFormaPagtoGuru(guruBody) {
    const payment = guruBody.payment
    let _dados_cartao

    switch (payment.method) {
        case "billet":
            _codFormaPag = "64"
            break
        case "pix":
            _codFormaPag = "63"
            break
        default:
            _codFormaPag = "65"
            try {
                _dados_cartao = {}
                _dados_cartao['Numero'] = payment.credit_card.first_digits + "xxxxxx" + payment.credit_card.last_digits
                // _dados_cartao['Titular'] = payment['holder_name']
            } catch { }

    }

    let _codCondPag

    switch (payment.installments.qty.toString()) {
        case "1":
            _codCondPag = "001"
            break
        case "2":
            _codCondPag = "003"
            break
        case "3":
            _codCondPag = "004"
            break
        case "4":
            _codCondPag = "005"
            break
        case "5":
            _codCondPag = "006"
            break
        case "6":
            _codCondPag = "007"
            break
        case "7":
            _codCondPag = "008"
            break
        case "8":
            _codCondPag = "009"
            break
        case "9":
            _codCondPag = "010"
            break
        case "10":
            _codCondPag = "011"
            break
        case "11":
            _codCondPag = "021"
            break
        case "12":
            _codCondPag = "022"
            break
        default:
            _codCondPag = "001"
    }

    _return = {
        CodFormaPag: _codFormaPag,
        CodCondPag: _codCondPag
    }

    if (_dados_cartao) {
        _return['DadosCartao'] = _dados_cartao
    }

    return _return
}

function _buildFormaPagto(yampiBody) {

    const payment = yampiBody.resource.transactions.data[0]
    // const sku = yampiBody.resource.items.data[0].sku.data.sku

    let _dados_cartao

    switch (payment.payment.data.alias) {
        case "billet":
            _codFormaPag = "64"
            break
        case "pix":
            _codFormaPag = "63"
            break
        default:
            _codFormaPag = "65"
            try {
                _dados_cartao = {}
                _dados_cartao['Numero'] = payment['truncated_card']
                _dados_cartao['Titular'] = payment['holder_name']
            } catch { }

    }

    let _codCondPag

    switch (payment.installments.toString()) {
        case "1":
            _codCondPag = "001"
            break
        case "2":
            _codCondPag = "003"
            break
        case "3":
            _codCondPag = "004"
            break
        case "4":
            _codCondPag = "005"
            break
        case "5":
            _codCondPag = "006"
            break
        case "6":
            _codCondPag = "007"
            break
        case "7":
            _codCondPag = "008"
            break
        case "8":
            _codCondPag = "009"
            break
        case "9":
            _codCondPag = "010"
            break
        case "10":
            _codCondPag = "011"
            break
        case "11":
            _codCondPag = "021"
            break
        case "12":
            _codCondPag = "022"
            break
        default:
            _codCondPag = "001"
    }

    _return = {
        CodFormaPag: _codFormaPag,
        CodCondPag: _codCondPag
    }

    if (_dados_cartao) {
        _return['DadosCartao'] = _dados_cartao
    }

    return _return
}

function _getCodProduto(zipdata, sku) {
    const zipCodeInt = parseInt(zipdata)
    let codProduto

    switch (sku) {

        case "rvohairgummy":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002729"
            } else {
                codProduto = "00002730"
            }
            break

        case "kitrevolution-amostra":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002451"
            } else {
                codProduto = "00002669"
            }
            break

        case "kitrevolution-5app":
        case "kitrevolution-15d":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002672"
            } else {
                codProduto = "00002673"
            }
            break

        case "kitrevolution-10app":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002725"
            } else {
                codProduto = "00002727"
            }
            break

        case "kitrevolution-10app-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002726"
            } else {
                codProduto = "00002728"
            }
            break

        case "kitrevolution-60app-pro":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002700"
            } else {
                codProduto = "00002702"
            }
            break

        case "kitrevolution-30app-pro":
        case "kitrevolution-30app-pro-black":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002696"
            } else {
                codProduto = "00002698"
            }
            break

        case "kitrevolution-30app-pro-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002697"
            } else {
                codProduto = "00002699"
            }
            break

        case "kitrevolution-60app-pro-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002701"
            } else {
                codProduto = "00002703"
            }
            break

        case "acidohialuronico-app-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002550"
            } else {
                codProduto = "00002552"
            }
            break

        case "aguamicelar-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002693"
            } else {
                codProduto = "00002695"
            }
            break

        case "revcaps60-biotina-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002683"
            } else {
                codProduto = "00002685"
            }
            break

        case "revolutionprotect-brinde":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002710"
            } else {
                codProduto = "00002712"
            }
            break

        case "rvogummy":
            if (isSaoPauloState(zipCodeInt)) {
                codProduto = "00002717"
            } else {
                codProduto = "00002718"
            }
            break

        default:
            throw new Error("Product Map didn't exists.")
    }

    return codProduto
}

function _getCodEstab(zipdata) {
    const zipCodeInt = parseInt(zipdata)
    let codEstab

    if (isSaoPauloState(zipCodeInt)) {
        codEstab = "003"
    }
    // else {
    //   codEstab = "006"
    // }

    return codEstab
}

function _buildItensGuru(guruBody) {
    const product_id = guruBody.product.id
    const _value_products = guruBody.product.total_value
    const _produtos = []

    switch (product_id) {
        case "ID DO KIT":
        default:
            //É necessário fazer cálculos a cada kit para verificar o valor final de cada
            //item e valor do desconto. Não dá pra colocar valor estático porque tem os
            //cupons de desconto. Por isso precisa calcular usando o valor final de venda.
            //variável com o valor '_value_products'
            const _item_1 = {
                "Seq": "ORDEM NA LISTA",
                "Qtd": "QUANTIDADE",
                "CodProduto": "CÓDIGO VANROOY",
                "TipoDesconto": "V", //V ou P. Melhor deixar
                "ValorUnitario": "Valor do produto",
                "Desconto": "Valor do desconto",
                "ValorDesconto": "Valor do desconto",
                "ValorTotal": "Valor total desse produto"
            }

            _produtos.push(_item_1)
            break

    }

    return _produtos
}

function _buildItens(yampiBody) {
    const produtos = yampiBody.resource.items.data
    if (!Array.isArray(produtos)) {
        throw new Error("produtos isn't an array")
    }

    const _produtos = []
    let _productCount = 1

    const _final_discount = yampiBody.resource.value_discount
    const _final_products_value = yampiBody.resource.value_products

    for (const _product of produtos) {
        const _currentProduct = {}

        const price_sale_str = _product.sku.data.price_sale.toString()
        const price_sale_number = parseFloat(price_sale_str)

        const price_total_str = _product.price.toString()
        const price_total_number = parseFloat(price_total_str)

        let _product_value
        if (price_sale_number === 0) {
            _product_value = 1
        } else {
            _product_value = price_sale_number
        }

        const _proportion_value = price_total_number / _final_products_value
        const _discount_total_item = _final_discount * _proportion_value

        _currentProduct["Seq"] = _productCount
        _currentProduct["Qtd"] = _product.quantity
        _currentProduct["CodProduto"] = _getCodProduto(yampiBody.resource.shipping_address.data.zip_code, _product.item_sku)
        _currentProduct["TipoDesconto"] = "V"

        _currentProduct["ValorUnitario"] = _product_value

        const _desconto = (_product.sku.data.price_sale - _product.price) + _discount_total_item
        _currentProduct["Desconto"] = _desconto ? _desconto : 0

        const _valorDesconto = (_product.sku.data.price_sale - _product.price) + _discount_total_item
        _currentProduct["ValorDesconto"] = _valorDesconto ? _valorDesconto : 0

        const _valorTotal = _product_value - _currentProduct["ValorDesconto"]
        _currentProduct["ValorTotal"] = _valorTotal ? _valorTotal : 0

        JSON.stringify(_currentProduct)

        _produtos.push(_currentProduct)
        _productCount++
    }

    return _produtos
}

function _getMidia(yampiBody) {
    let _midia
    _midia = _getMidiaFromInfluencer(yampiBody)

    if (!_midia) {
        _midia = _getMidiaFromSKU(yampiBody)
    }

    return _midia
}

function _getMidiaFromInfluencer(yampiBody) {
    const _parameters = _trafficProccessParameters(yampiBody)

    switch (_parameters.inf) {
        case "mayracardi":
            return "321"
        case "jujusalimeni":
            return "158"
        case "thaeme":
            return "313"
        case "gracielelacerdaoficial":
            return "231"
        case "millagomes":
            return "269"
        case "viviwinkler":
            return "319"
        case "tamirisrodrigues":
            return "307"
        case "cintiachagass":
            return "395"
        case "amandafrancosooficial":
            return "376"
        case "andressaferreiramiranda":
            return "340"
        case "silvyealves":
            return "299"
        case "luizavono":
            return "402"
    }
}

function _getVendedorFromUTM(yampiBody) {
    console.log("_getVendedorFromUTM")
    const _source = yampiBody.resource.utm_source
    const _vendedor = yampiBody.resource.utm_medium

    console.log("_source")
    console.log(_source)
    console.log(_vendedor)

    if (_source != "equipe_de_vendas") {
        return null;
    }

    switch (_vendedor) {
        case "bruna":
            return "0742"
        case "carlos":
            return "0837"
        case "davi":
            return "0838"
        case "thaluana":
            return "0858"
        case "fernanda":
        case "fernanda_salustiano":
            return "0864"
        case "barbara":
            return "0839"
        case "larissa":
            return "0836"
        case "fernanda_dantas":
            return "0760"
        case "renata":
            return "0843"
        case "juliana":
            return "0844"
        case "genise":
            return "0804"
        case "helena":
            return "0789"
        case "jefferson":
            return "0772"
        case "samanta":
            return "0876"
        case "rubi":
            return "0813"
        case "rosana":
            return "0308"
        case "natalia":
            return "0853"
        case "karen":
            return "0865"
        case "giulianna":
            return "0845"
        case "michael":
            return "0811"
        case "marcos":
            return "0619"
        case "ingrid":
            return "0863"
        case "vanessa":
            return "0808"
        case "tamara":
            return "0726"
        case "jaiane":
            return "0361"
        case "isabella":
            return "0030"
        default:
            return "0846"
    }
}

function _getMidiaFromSKU(yampiBody) {
    const sku = yampiBody.resource.items.data[0].sku.data.sku

    if (sku == "kitrevolution-amostra") {
        return "256"
    } else {
        return "385"
    }
}

function _trafficProccessParameters(yampiBody) {
    const _source = yampiBody.resource.utm_source
    const _traffic_utms = {}
    const parameters = {}

    if (yampiBody.resource.utm_campaign) {
        _traffic_utms.utm_content = yampiBody.resource.utm_campaign
    }

    if (yampiBody.resource.utm_terms) {
        _traffic_utms.utm_content = yampiBody.resource.utm_terms
    }

    if (yampiBody.resource.utm_medium) {
        _traffic_utms.utm_content = yampiBody.resource.utm_medium
    }

    if (yampiBody.resource.utm_content) {
        _traffic_utms.utm_content = yampiBody.resource.utm_content
    }

    if (_source) {
        parameters["source"] = _source.toLowerCase()
    }

    for (const _key of Object.keys(_traffic_utms)) {
        if (_traffic_utms[_key] === undefined) {
            continue;
        }

        let _string_to_match = _traffic_utms[_key]
        let _match = _string_to_match.match(/\[((\w*))(:)((\w|\d|-| )*)\]/g)

        if (_match === null) {
            continue;
        }

        for (const _matched of _match) {

            let _nameMatch = _matched.match(/((\w*))(:)/)[2]
            let _valueMatch = _matched.match(/(:)((\w|\d|-| )*)/)[2]

            if (_nameMatch && _valueMatch) {
                const _name = _nameMatch.replace(":", "").toLowerCase()
                const _value = _valueMatch.replace(":", "").toLowerCase()

                parameters[_name] = _value
            }
        }
    }

    this.parameters = parameters

    return parameters
}

function convertGuruToVanRooy(guruBody) {

    const data = new Date(guruBody.dates.confirmed_at)
    const zipcode = new Date(guruBody.contact.address_zip_code)
    const produtos = _buildItensGuru(guruBody)
    const payment = _buildFormaPagtoGuru(guruBody)
    const delivery = _buildEntregaGuru(guruBody)
    const midia = "846"
    // const _codVendedor = _getVendedorFromUTM(guruBody)

    const total_str = guruBody.payment.total
    const total_number = parseFloat(total_str)
    let _obs = ""

    if (delivery.obs !== undefined) {
        _obs = delivery.obs
    }

    const _vanrooy_body = {
        Erro: null,
        Pedido: {
            NumeroPedido: guruBody.id,
            CodEstab: _getCodEstab(zipcode),
            DataPedido: data.toISOString(),
            TotalPedido: total_number,
            ValorFrete: delivery.price,
            CdTransp: delivery.provider,
            CdModalEntr: delivery.type,
            Midia: midia,
            Campanha: "000000000038",
            // CdVend: _codVendedor,
            Cliente: {
                CodCliente: guruBody.contact.id,
                Nome: guruBody.contact.name.trim(),
                CodLogr: "R",
                Endereco: guruBody.contact.address,
                Numero: guruBody.contact.address_number,
                Compl: guruBody.contact.address_comp,
                Bairro: guruBody.contact.address_district,
                Cidade: guruBody.contact.address_city,
                Estado: guruBody.contact.address_state,
                CEP: guruBody.contact.address_zip_code,
                ObsEndereco: _obs,
                // DDI1:"",
                Email1: guruBody.contact.email,
                DDD1: guruBody.contact.phone_local_code,
                Tel1: guruBody.contact.phone_number,
                FisJur: "F",
                CPF: guruBody.contact.address_number.trim(),

            },
            Produtos: produtos,
            Pagamento: payment
        }
    }

    return _vanrooy_body
}

function convertYampiToVanRooy(yampiBody) {

    const data = new Date(yampiBody.resource.transactions.data[0].updated_at.date)
    const produtos = _buildItens(yampiBody)
    const payment = _buildFormaPagto(yampiBody)
    const delivery = _buildEntrega(yampiBody)
    const _codVendedor = _getVendedorFromUTM(yampiBody)

    const total_str = yampiBody.resource.value_total
    const total_number = parseFloat(total_str)
    let _obs = ""

    if (delivery.obs !== undefined) {
        _obs = delivery.obs
    }

    // if (yampiBody.resource.shipping_address.data.complement !== null && yampiBody.resource.shipping_address.data.complement !== "null" && yampiBody.resource.shipping_address.data.complement !== undefined) {
    //   _obs = _obs + " | " + yampiBody.resource.shipping_address.data.complement
    // }

    const _vanrooy_body = {
        Erro: null,
        Pedido: {
            NumeroPedido: yampiBody.resource.id,
            CodEstab: _getCodEstab(yampiBody.resource.shipping_address.data.zip_code),
            DataPedido: data.toISOString(),
            TotalPedido: total_number,
            ValorFrete: delivery.price,
            CdTransp: delivery.provider,
            CdModalEntr: delivery.type,
            Midia: _getMidia(yampiBody),
            Campanha: "000000000038",
            CdVend: _codVendedor,
            Cliente: {
                CodCliente: yampiBody.resource.customer.data.id,
                Nome: yampiBody.resource.customer.data.name.trim(),
                CodLogr: "R",
                Endereco: yampiBody.resource.shipping_address.data.street,
                Numero: yampiBody.resource.shipping_address.data.number,
                Compl: yampiBody.resource.shipping_address.data.complement,
                Bairro: yampiBody.resource.shipping_address.data.neighborhood,
                Cidade: yampiBody.resource.shipping_address.data.city,
                Estado: yampiBody.resource.shipping_address.data.state,
                CEP: yampiBody.resource.shipping_address.data.zip_code,
                ObsEndereco: _obs,
                // DDI1:"",
                Email1: yampiBody.resource.customer.data.email,
                DDD1: yampiBody.resource.customer.data.phone.area_code,
                Tel1: yampiBody.resource.customer.data.phone.number,
                FisJur: "F",
                CPF: yampiBody.resource.customer.data.cpf.trim(),

            },
            Produtos: produtos,
            Pagamento: payment
        }
    }

    return _vanrooy_body

}

async function getNotIntegratedList() {

    const _parameters = event.body
    const _vanRooyProccessed = !_parameters.ApenasNaoProcessados

    const MongoClient = require('mongodb').MongoClient

    const {
        database,
        hostname,
        username,
        password,
    } = auths.mongodb

    const url = `mongodb+srv://${username}:${password}@${hostname}/test?retryWrites=true&w=majority`
    const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    const db = client.db(database)
    // Enter your target collection as a parameter to this step
    // this.res = await db.collection(params.collection).findOne({ "data.resource.id": params.order_id }, {}) 
    this.match = {
        "origin_platform": "yampi",
        "integrations.vanrooy.status": false
    }

    this.allOrders = await db.collection(params.collection).find(this.match).sort({ "created_at": -1 }).limit(steps.configs.oreder_per_cycle).toArray()
    client.close()

    // const cursor = await mongoFind({ "vanRooy.integrationStatus": _vanRooyProccessed }, {})
    // const _allOrders = []
    this.orders_not_integrated_ids = []

    for (const doc of this.allOrders) {
        this.orders_not_integrated_ids.push(doc.platform_id)
    }

    orders_not_integrated_ids.sort(function (a, b) {
        return a - b;
    });


    return {
        status: 200,
        headers: { "Content-Type": 'application/json' },
        body: { ListagemPedidos: this.orders_not_integrated_ids }
    }
}

async function getSpecificOrder() {

    let _query
    if (_request_parameter.length > 10) {
        _query = { "platform_id": _request_parameter }
    } else {
        _query = { "platform_id": parseInt(_request_parameter) }
    }

    console.log("_query")
    console.log(_query)

    const order = await mongoFindOne(_query, {})

    if (order === undefined) {
        return {
            status: 404
        }
    }

    let body;

    switch (order.origin_platform) {
        case "guru":
            body = convertGuruToVanRooy(order.data.guru)
            break

        case "yampy":
        default:
            body = convertYampiToVanRooy(order.data.yampi)
    }

    return {
        status: 200,
        headers: { "Content-Type": 'application/json' },
        body: body
    }
}

async function mongoUpdateOne(query, docUpdate) {
    const MongoClient = require('mongodb').MongoClient

    const {
        database,
        hostname,
        username,
        password,
    } = auths.mongodb

    const url = `mongodb+srv://${username}:${password}@${hostname}/test?retryWrites=true&w=majority`
    const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    const db = client.db(database)

    const _return = await db.collection(params.collection).updateOne(query, docUpdate, {})
    await client.close()

    return _return
}

async function mongoFindOne(query) {
    const MongoClient = require('mongodb').MongoClient

    const {
        database,
        hostname,
        username,
        password,
    } = auths.mongodb

    const url = `mongodb+srv://${username}:${password}@${hostname}/test?retryWrites=true&w=majority`
    const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    const db = client.db(database)

    const _return = await db.collection(params.collection).findOne(query, {})

    await client.close()

    return _return
}

async function mongoFind(query) {
    const MongoClient = require('mongodb').MongoClient

    const {
        database,
        hostname,
        username,
        password,
    } = auths.mongodb

    const url = `mongodb+srv://${username}:${password}@${hostname}/test?retryWrites=true&w=majority`
    const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    const db = client.db(database)
    // Enter your target collection as a parameter to this step
    // this.res = await db.collection(params.collection).findOne({ "data.resource.id": params.order_id }, {}) 

    const _return = await db.collection(params.collection).find(query, { "sort": ['data.time', 'asc'] }).limit(20)

    // await client.close()

    return _return

}

switch (_request_method) {
    case "POST":
        $respond(await getNotIntegratedList())
        break

    case "GET":
        $respond(await getSpecificOrder())
        break

    case "PATCH":
        $respond(await orderIntegratedUpdate())
        break
}