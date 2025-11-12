#include "UgcData.h"

std::string Base64Encode(const std::vector<uint8_t> &data)noexcept{
  static const char *ENCODE_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  std::string out;
	try{
		out.reserve((data.size() + 2) / 3 * 4);
	}catch(...){
		return "";
	}

  size_t i = 0;
  for(; i + 2 < data.size(); i += 3){
    uint32_t n = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    out.push_back(ENCODE_TABLE[(n >> 18) & 63]);
    out.push_back(ENCODE_TABLE[(n >> 12) & 63]);
    out.push_back(ENCODE_TABLE[(n >> 6)  & 63]);
    out.push_back(ENCODE_TABLE[n & 63]);
  }

  if(i + 1 == data.size()){
    uint32_t n = (data[i] << 16);
    out.push_back(ENCODE_TABLE[(n >> 18) & 63]);
    out.push_back(ENCODE_TABLE[(n >> 12) & 63]);
    out.push_back('=');
    out.push_back('=');
  }else if (i + 2 == data.size()){
    uint32_t n = (data[i] << 16) | (data[i + 1] << 8);
    out.push_back(ENCODE_TABLE[(n >> 18) & 63]);
    out.push_back(ENCODE_TABLE[(n >> 12) & 63]);
    out.push_back(ENCODE_TABLE[(n >> 6)  & 63]);
    out.push_back('=');
  }

  return out;
}

std::vector<uint8_t> Base64Decode(const std::string &string)noexcept{

  static const int DECODE_TABLE[256] = {
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,
    52,53,54,55,56,57,58,59,60,61,-1,-1,-1, 0,-1,-1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,
    15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,
    -1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
    41,42,43,44,45,46,47,48,49,50,51
  };

  std::vector<uint8_t> out;
  out.reserve(string.size() * 3 / 4);

  uint32_t buffer = 0;
  int bits_collected = 0;

  for(unsigned char c : string){
    if(std::isspace(c))continue; // ãÛîíÇÕñ≥éã
    if(c == '=')break;           // ÉpÉfÉBÉìÉOÇ≈èIóπ

    int val = DECODE_TABLE[c];
    if(val == -1)continue;       // ñ≥å¯ï∂éöÇÕÉXÉLÉbÉv

    buffer = (buffer << 6) | val;
    bits_collected += 6;

    if(bits_collected >= 8){
      bits_collected -= 8;
      out.push_back(static_cast<uint8_t>((buffer >> bits_collected) & 0xFF));
    }
  }

  return out;
}

bool UgcData::_load(Node &node)noexcept{
	Ex ex{};

	auto s = const_cast<char *>(node.key.c_str());
	if(isdigit(static_cast<uint8_t>(*s))){
		ex.id = strtol(s, &s, 10);
	}
	while(*s && isspace(static_cast<uint8_t>(*s))){
		++s;
	}
	auto name = s;
	while(*s && *s != '@'){
		++s;
	}
	ex.type = Ex::Type::unknown_t;
	if(*s == '@'){
		*(s++) = '\0';
		if(_stricmp(s, "int") == 0){
			ex.type = Ex::Type::int_t;
		}else if(_stricmp(s, "float") == 0){
			ex.type = Ex::Type::float_t;
		}else if(_stricmp(s, "str") == 0 || _stricmp(s, "string") == 0){
			ex.type = Ex::Type::string_t;
		}else if(_stricmp(s, "data") == 0){
			ex.type = Ex::Type::data_t;
		}
	}
	try{
		ex.name = name;
	}catch(...){
		return false;
	}

	auto f = [](Ex &ex, Node &node)noexcept -> bool {
		switch(ex.type){
		case Ex::Type::unknown_t:
			if(node.type != Node::Type::string_t){
				// å^ÇÃëäà·
			}
			node.type = Node::Type::string_t;
			try{
				ex.data = Base64Decode(node.value_string);
			}catch(...){
				return false;
			}
			break;
		case Ex::Type::int_t:
			switch(node.type){
			case Node::Type::null_t:
			case Node::Type::false_t:
				node.value_int = 0;
				break;
			case Node::Type::true_t:
				node.value_int = 1;
				break;
			case Node::Type::int_t:
				break;
			case Node::Type::float_t:
				node.value_int = static_cast<int32_t>(node.value_float);
				break;
			default:
				// å^ÇÃëäà·
				break;
			}
			node.type = Node::Type::int_t;
			break;
		case Ex::Type::float_t:
			switch(node.type){
			case Node::Type::null_t:
			case Node::Type::false_t:
				node.value_float = 0;
				break;
			case Node::Type::true_t:
				node.value_float = 1;
				break;
			case Node::Type::int_t:
				node.value_float = node.value_int;
				break;
			case Node::Type::float_t:
				break;
			default:
				// å^ÇÃëäà·
				break;
			}
			node.type = Node::Type::float_t;
			break;
		case Ex::Type::string_t:
			if(node.type != Node::Type::string_t){
				// å^ÇÃëäà·
			}
			node.type = Node::Type::string_t;
			break;
		case Ex::Type::data_t:
			if(node.type != Node::Type::string_t){
				// å^ÇÃëäà·
			}
			node.type = Node::Type::string_t;
			try{
				ex.data = Base64Decode(node.value_string);
			}catch(...){
				return false;
			}
			break;
		case Ex::Type::array_t:
			// 
			return false;
		case Ex::Type::object_t:
			if(node.type != Node::Type::object_t){
				// å^ÇÃëäà·
			}
			node.type = Node::Type::object_t;
			break;
		}
		return true;
	};
	switch(node.type){
	case Node::Type::object_t:
		ex.type = Ex::Type::object_t;
		break;
	case Node::Type::array_t:
		for(auto &child : node.children){
			auto child_ex = reinterpret_cast<Ex *>(child.ex);
			if(!child_ex || !f(ex, child)){
				return false;
			}
			child_ex->id = ex.id;
			child_ex->type = ex.type;
		}
		ex.type = Ex::Type::array_t;
		break;
	default:
		if(!f(ex, node)){
			return false;
		}
		break;
	}
	try{
		_exes.push_back(ex);
		node.ex = &_exes.back();
	}catch(...){
		return false;
	}

	return true;
}

bool UgcData::_save(Node &node)noexcept{

	try{
		if(!node.ex){
			return true;
		}
		auto &ex = *reinterpret_cast<Ex *>(node.ex);
		auto key = std::to_string(ex.id);
		if(!ex.name.empty()){
			key += " " + ex.name;
		}
		switch(ex.type){
		case Ex::Type::unknown_t:
			node.type = Node::Type::string_t;
			node.value_string = Base64Encode(ex.data);
			break;
		case Ex::Type::int_t:
			key += "@int";
			node.type = Node::Type::int_t;
			break;
		case Ex::Type::float_t:
			key += "@float";
			node.type = Node::Type::float_t;
			break;
		case Ex::Type::string_t:
			key += "@string";
			node.type = Node::Type::string_t;
			break;
		case Ex::Type::data_t:
			key += "@data";
			node.type = Node::Type::string_t;
			node.value_string = Base64Encode(ex.data);
			break;
		}
		//char buf[256];
		//sprintf_s(buf, "// 0x%X %dçsñ⁄", ex.offset, ex.line);
		//key += buf;
		node.key = key;
	}catch(...){
		return false;
	}

	return true;
}

UgcData::Node *UgcData::push_back_int(Node &parent, uint32_t id, const std::string &name, uint32_t value, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::int_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::null_t;
		node->key = name;
		node->value_int = value;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::push_back_float(Node &parent, uint32_t id, const std::string &name, double value, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::float_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::null_t;
		node->key = name;
		node->value_float = value;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::push_back_string(Node &parent, uint32_t id, const std::string &name, const char *value, size_t value_size, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::string_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::null_t;
		node->key = name;
		node->value_string = std::string(value, value_size);
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::push_back_data(Node &parent, uint32_t id, const std::string &name, const uint8_t *value, size_t value_size, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::data_t;
		ex.data = std::vector<uint8_t>(value, value + value_size);
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::null_t;
		node->key = name;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::push_back_array(Node &parent, uint32_t id, const std::string &name, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::array_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::array_t;
		node->key = name;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::push_back_object(Node &parent, uint32_t id, const std::string &name, uint32_t offset, uint32_t line)noexcept{
	try{
		Ex ex{};
		ex.offset = offset;
		ex.line = line;
		ex.id = id;
		ex.type = Ex::Type::object_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::object_t;
		node->key = name;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

UgcData::Node *UgcData::search_id(Node &parent_object,uint32_t id)const noexcept{
	auto &children = parent_object.children;
	for(auto &child : parent_object.children){
		if(child.ex){
			auto &ex = *reinterpret_cast<Ex *>(child.ex);
			if(ex.id == id){
				return &child;
			}
		}
	}
	return nullptr;
}
