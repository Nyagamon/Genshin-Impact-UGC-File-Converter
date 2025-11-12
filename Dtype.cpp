#include "Dtype.h"

bool Dtype::_load(Node &node)noexcept{
	Ex ex{};
	if(node.line==6){
		ex=ex;
	}
	// ルートオブジェクトにキーは無し
	if(&node == &_root){
		if(node.type != Node::Type::object_t){
			fprintf(stderr, "Error: %d行目: オブジェクト以外のルートノードを検出\n", node.line);
			return false;
		}
		try{
			ex.type = Ex::Type::object_t;
			_exes.push_back(ex);
			node.ex = &_exes.back();
		}catch(...){
			return false;
		}
		return true;
	}

	if(node.type == Node::Type::array_t){
		fprintf(stderr, "Error: %d行目: 配列を検出。dtypeに配列を含めることはできません。\n", node.line);
		return false;
	}

	auto s = const_cast<char *>(node.key.c_str());
	if(!isdigit(static_cast<uint8_t>(*s))){
		fprintf(stderr, "Error: %d行目: キーの1文字目が数字ではありませんでした。\n", node.line);
		return false;
	}
	ex.id = strtol(s, &s, 10);
	const char *s1 = nullptr, *s2 = nullptr;
	while(*s){
		while(*s && isspace(static_cast<uint8_t>(*s))){
			*(s++) = '\0';
		}
		if(*s == 0){
			break;
		}else if(*s == '[' && s[1] == ']'){
			ex.is_array = true;
			*s = '\0';
			s += 2;
		}else if(s2){
			fprintf(stderr, "Error: %d行目: キーに3つ目の文字列を検出。\n", node.line);
			return false;
		}else{
			if(s1){
				s2 = s;
			}else{
				s1 = s;
			}
			while(*s && !isspace(static_cast<uint8_t>(*s)) && *s != '['){
				++s;
			}
		}
	}
	try{
		if(node.type == Node::Type::object_t){
			if(s2){
				fprintf(stderr, "Error: %d行目: オブジェクトに2つ目の文字列を検出。\n", node.line);
				return false;
			}else if(s1){
				ex.name = s1;
			}
			ex.type = Ex::Type::object_t;
		}else{
			const char *t = "";
			if(s2){
				ex.name = s2;
				t = s1;
			}else if(s1){
				t = s1;
			}
			if(_stricmp(t, "int") == 0){
				ex.type = Ex::Type::int_t;
			}else if(_stricmp(t, "float") == 0){
				ex.type = Ex::Type::float_t;
			}else if(_stricmp(t, "str") == 0 || _stricmp(t, "string") == 0){
				ex.type = Ex::Type::string_t;
			}else if(_stricmp(t, "data") == 0){
				ex.type = Ex::Type::data_t;
			}else{
				ex.type = Ex::Type::unknown_t;
			}
		}
		_exes.push_back(ex);
		node.ex = &_exes.back();
	}catch(...){
		return false;
	}

	return true;
}

bool Dtype::_save(Node &node)noexcept{
	try{
		if(!node.ex){
			return false;
		}
		auto &ex = *reinterpret_cast<Ex *>(node.ex);
		auto key = std::to_string(ex.id);
		switch(ex.type){
		case Ex::Type::int_t:
			key += " int";
			break;
		case Ex::Type::float_t:
			key += " float";
			break;
		case Ex::Type::string_t:
			key += " str";
			break;
		case Ex::Type::data_t:
			key += " data";
			break;
		}
		if(ex.is_array && ex.type != Ex::Type::object_t){
			key += ex.type == Ex::Type::unknown_t ? " []" : "[]";
		}
		if(!ex.name.empty()){
			key += " " + ex.name;
		}
		if(ex.is_array && ex.type == Ex::Type::object_t){
			key += ex.name.empty() ? " []" : "[]";
		}
		node.key = key;
		if(ex.type == Ex::Type::object_t){
			node.type = Node::Type::object_t;
		}else{
			node.type = Node::Type::int_t;
			node.value_int = 0;
		}
	}catch(...){
		return false;
	}
	return true;
}

Dtype::Node *Dtype::push_back_int(Node &parent, uint32_t id)noexcept{
	try{
		Ex ex{};
		ex.id = id;
		ex.type = Ex::Type::int_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::int_t;
		node->value_int = 0;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

Dtype::Node *Dtype::push_back_float(Node &parent, uint32_t id)noexcept{
	try{
		Ex ex{};
		ex.id = id;
		ex.type = Ex::Type::float_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::int_t;
		node->value_int = 0;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

Dtype::Node *Dtype::push_back_unknown(Node &parent, uint32_t id)noexcept{
	try{
		Ex ex{};
		ex.id = id;
		ex.type = Ex::Type::unknown_t;
		_exes.push_back(ex);
		parent.children.push_back({});
		auto node = &parent.children.back();
		node->type = Node::Type::int_t;
		node->value_int = 0;
		node->ex = &_exes.back();
		return node;
	}catch(...){
	}
	return nullptr;
}

Dtype::Node *Dtype::search_id(Node &parent_object,uint32_t id)const noexcept{
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

Dtype::Node *Dtype::search_name(Node &parent_object, const std::string &name)const noexcept{
	auto &children = parent_object.children;
	for(auto &child : parent_object.children){
		if(child.ex){
			auto &ex = *reinterpret_cast<Ex *>(child.ex);
			if(ex.name == name){
				return &child;
			}
		}
	}
	return nullptr;
}
